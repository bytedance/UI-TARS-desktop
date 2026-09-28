import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, realpath, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createServer } from '../src/server.js';

describe('create_directory', () => {
  let client: Client;
  let dir: string;

  const call = async (name: string, args: Record<string, string>) =>
    client.callTool({ name, arguments: args }) as Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;

  beforeAll(async () => {
    dir = await realpath(await mkdtemp(path.join(tmpdir(), 'mcp-create-dir-')));
    client = new Client({ name: 'test client', version: '1.0' });

    const server = createServer({ allowedDirectories: [dir] });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  test('creates nested directories when no intermediate level exists', async () => {
    const target = path.join(dir, 'missing-parent', 'child', 'grandchild');

    const result = await call('create_directory', { path: target });

    expect(result.isError).toBeFalsy();
    expect((await stat(target)).isDirectory()).toBe(true);
  });

  test('still creates a single level whose parent exists', async () => {
    const target = path.join(dir, 'single-level');

    const result = await call('create_directory', { path: target });

    expect(result.isError).toBeFalsy();
    expect((await stat(target)).isDirectory()).toBe(true);
  });

  test('still refuses a path outside the allowed directories', async () => {
    const outside = path.join(path.dirname(dir), 'teamai-outside-allowed');

    const result = await call('create_directory', { path: outside });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('outside allowed directories');
  });
});
