import { it, expect } from 'vitest';
import { WorkspacePack } from '../src';
import path from 'path';

const PACK_DIR = path.join(__dirname, '../../context-engineer/src');

it('DirectoryExpander', async () => {
  const directoryExpander = new WorkspacePack();
  const result = await directoryExpander.packPaths([PACK_DIR]);
  expect(result.packedContent).toMatchSnapshot();
});
