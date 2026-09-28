import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createServer } from '../src/server.js';

describe('move_file', () => {
  let client: Client;
  let dir: string;

  const call = async (name: string, args: Record<string, string>) =>
    client.callTool({ name, arguments: args }) as Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;

  beforeAll(async () => {
    // Validate through realpath so the allowed-directory prefix check sees the
    // same spelling the server resolves to (8.3 short names on Windows).
    dir = await realpath(await mkdtemp(path.join(tmpdir(), 'mcp-move-file-')));
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

  test('refuses to overwrite an existing destination', async () => {
    await call('write_file', {
      path: path.join(dir, 'source.txt'),
      content: 'SOURCE',
    });
    await call('write_file', {
      path: path.join(dir, 'destination.txt'),
      content: 'KEEP_DESTINATION',
    });

    const result = await call('move_file', {
      source: path.join(dir, 'source.txt'),
      destination: path.join(dir, 'destination.txt'),
    });

    expect(result.isError).toBe(true);
    expect(await readFile(path.join(dir, 'source.txt'), 'utf-8')).toBe(
      'SOURCE',
    );
    expect(await readFile(path.join(dir, 'destination.txt'), 'utf-8')).toBe(
      'KEEP_DESTINATION',
    );
  });

  test('still moves when the destination does not exist', async () => {
    await call('write_file', {
      path: path.join(dir, 'fresh-source.txt'),
      content: 'FRESH',
    });

    const result = await call('move_file', {
      source: path.join(dir, 'fresh-source.txt'),
      destination: path.join(dir, 'fresh-destination.txt'),
    });

    expect(result.isError).toBeFalsy();
    expect(
      await readFile(path.join(dir, 'fresh-destination.txt'), 'utf-8'),
    ).toBe('FRESH');
  });
});
