import { it, expect } from 'vitest';
import { DirectoryExpander } from '../src';
import path from 'path';

const AgentServer = path.join(__dirname, '../../agent-server/src');

it('DirectoryExpander', async () => {
  const directoryExpander = new DirectoryExpander();
  const result = await directoryExpander.expandDirectories(['src'], AgentServer);
  expect(result).toMatchSnapshot();
});
