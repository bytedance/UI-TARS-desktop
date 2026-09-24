import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WorkspacePack } from '../src/node/workspace-pack';

describe('WorkspacePack.packPaths with sibling paths', () => {
  let workspace: string;
  let dirA: string;
  let dirAB: string;

  beforeAll(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-pack-'));
    dirA = path.join(workspace, 'pkg', 'a');
    dirAB = path.join(workspace, 'pkg', 'ab');
    fs.mkdirSync(dirA, { recursive: true });
    fs.mkdirSync(dirAB, { recursive: true });
    fs.writeFileSync(path.join(dirA, 'one.ts'), 'export const one = 1;\n');
    fs.writeFileSync(path.join(dirAB, 'two.ts'), 'export const two = 2;\n');
  });

  afterAll(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  const directoryBlocks = (packedContent: string) => {
    const blocks = new Map<string, string>();
    const blockPattern = /<directory path="([^"]+)">([\s\S]*?)<\/directory>/g;

    let match: RegExpExecArray | null;
    while ((match = blockPattern.exec(packedContent)) !== null) {
      blocks.set(match[1], match[2]);
    }

    return blocks;
  };

  it('should pack prefix-sharing directories into separate blocks', async () => {
    const pack = new WorkspacePack();
    const result = await pack.packPaths([dirA, dirAB]);

    // Every requested path still gets its own block
    expect([...directoryBlocks(result.packedContent).keys()].sort()).toEqual(
      [dirA, dirAB].sort(),
    );

    const blocks = directoryBlocks(result.packedContent);
    expect(blocks.get(dirA)).toContain('<file path="one.ts">');
    expect(blocks.get(dirA)).not.toContain('two.ts');
    expect(blocks.get(dirAB)).toContain('<file path="two.ts">');

    // No file content is emitted twice
    expect(result.packedContent.split('<file path=').length - 1).toBe(result.stats.totalFiles);
    expect(result.stats.totalFiles).toBe(2);
  });
});
