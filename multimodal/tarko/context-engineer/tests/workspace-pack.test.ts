import { it, expect } from 'vitest';
import { WorkspacePack } from '../src';
import path from 'path';

const PACK_DIR = path.join(__dirname, '../../config-loader/src');
const CWD = path.join(__dirname, '../../config-loader');

it('DirectoryExpander', async () => {
  const directoryExpander = new WorkspacePack();
  const result = await directoryExpander.packPaths([PACK_DIR], CWD);
  expect(result.packedContent).toMatchSnapshot();
});
