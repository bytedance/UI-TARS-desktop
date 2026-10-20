import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import path from 'path';
import url from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

describe('MCP Server in memory', () => {
  test('listTools should return a list of tools', async () => {
    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          roots: {
            listChanged: true,
          },
        },
      },
    );

    const server = createServer({
      allowedDirectories: [path.join(__dirname, './fixtures')],
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.listTools();

    expect(result.tools.length).toBeGreaterThan(0);
  });

  describe('callTool', () => {
    let client: Client;

    beforeAll(async () => {
      client = new Client({
        name: 'test client',
        version: '1.0',
      });

      const server = createServer({
        allowedDirectories: [path.join(__dirname, './fixtures/normal')],
      });
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

    describe('fixtures/normal', () => {
      test('read_file should return a result', async () => {
        const result = await client.callTool({
          name: 'read_file',
          arguments: {
            path: path.join(__dirname, './fixtures/normal/hello.txt'),
          },
        });
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: 'world',
            },
          ],
        });
      });

      test('list_directory should return a result', async () => {
        const result = await client.callTool({
          name: 'list_directory',
          arguments: {
            path: path.join(__dirname, './fixtures/normal'),
          },
        });
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: '[FILE] hello.txt',
            },
          ],
        });
      });
    });
  });

  describe('move_file', () => {
    let client: Client;
    let tmpDir: string;

    beforeAll(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-filesystem-move-'));
      client = new Client({
        name: 'move-file test client',
        version: '1.0',
      });
      const server = createServer({
        allowedDirectories: [tmpDir],
      });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

      await Promise.all([
        client.connect(clientTransport),
        server.connect(serverTransport),
      ]);
    });

    afterAll(async () => {
      await client.close();
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    test('should fail and preserve both files when the destination exists', async () => {
      const sourcePath = path.join(tmpDir, 'source.txt');
      const destinationPath = path.join(tmpDir, 'destination.txt');
      await client.callTool({
        name: 'write_file',
        arguments: { path: sourcePath, content: 'SOURCE' },
      });
      await client.callTool({
        name: 'write_file',
        arguments: { path: destinationPath, content: 'KEEP_DESTINATION' },
      });

      const result = await client.callTool({
        name: 'move_file',
        arguments: { source: sourcePath, destination: destinationPath },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);

      const destination = await client.callTool({
        name: 'read_file',
        arguments: { path: destinationPath },
      });
      expect(destination).toEqual({
        content: [{ type: 'text', text: 'KEEP_DESTINATION' }],
      });

      const source = await client.callTool({
        name: 'read_file',
        arguments: { path: sourcePath },
      });
      expect(source).toEqual({
        content: [{ type: 'text', text: 'SOURCE' }],
      });
    });

    test('should move to a fresh destination', async () => {
      const sourcePath = path.join(tmpDir, 'fresh-source.txt');
      const destinationPath = path.join(tmpDir, 'fresh-destination.txt');
      await client.callTool({
        name: 'write_file',
        arguments: { path: sourcePath, content: 'FRESH' },
      });

      const result = await client.callTool({
        name: 'move_file',
        arguments: { source: sourcePath, destination: destinationPath },
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Successfully moved ${sourcePath} to ${destinationPath}`,
          },
        ],
      });

      const destination = await client.callTool({
        name: 'read_file',
        arguments: { path: destinationPath },
      });
      expect(destination).toEqual({
        content: [{ type: 'text', text: 'FRESH' }],
      });
    });
  });
});
