/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, test } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { applyFileEdits } from '../src/utils.js';

async function createFile(content: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'mcp-filesystem-edit-'));
  const filePath = path.join(dir, 'example.txt');
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

describe('applyFileEdits', () => {
  test('writes a plain replacement literally', async () => {
    const filePath = await createFile('before TOKEN after');

    await applyFileEdits(filePath, [{ oldText: 'TOKEN', newText: 'plain' }]);

    expect(await readFile(filePath, 'utf-8')).toBe('before plain after');
  });

  test.each([
    ['$&', 'before $& after'],
    ['$$', 'before $$ after'],
    ["$'", "before $' after"],
    ['$', 'before $ after'],
  ])(
    'does not interpret %j as a JavaScript replacement pattern',
    async (newText, expected) => {
      const filePath = await createFile('before TOKEN after');

      await applyFileEdits(filePath, [{ oldText: 'TOKEN', newText }]);

      expect(await readFile(filePath, 'utf-8')).toBe(expected);
    },
  );
});
