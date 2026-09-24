import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

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

  describe('create_directory', () => {
    let client: Client;
    let temporaryDirectory: string;

    beforeAll(async () => {
      temporaryDirectory = await fs.mkdtemp(
        path.join(os.tmpdir(), 'mcp-filesystem-create-'),
      );
      client = new Client({
        name: 'create directory test client',
        version: '1.0',
      });

      const server = createServer({
        allowedDirectories: [temporaryDirectory],
      });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

      await Promise.all([
        client.connect(clientTransport),
        server.connect(serverTransport),
      ]);
    });

    afterAll(async () => {
      try {
        await client.close();
      } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
      }
    });

    test('creates multiple missing directory levels', async () => {
      const nestedPath = path.join(
        temporaryDirectory,
        'missing-parent',
        'child',
      );

      const result = await client.callTool({
        name: 'create_directory',
        arguments: { path: nestedPath },
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: `Successfully created directory ${nestedPath}`,
          },
        ],
      });
      await expect(fs.stat(nestedPath)).resolves.toMatchObject({
        isDirectory: expect.any(Function),
      });
    });

    test('creates a directory when only the final level is missing', async () => {
      const singleLevelPath = path.join(temporaryDirectory, 'single-level');

      const result = await client.callTool({
        name: 'create_directory',
        arguments: { path: singleLevelPath },
      });

      expect(result.isError).not.toBe(true);
      await expect(fs.stat(singleLevelPath)).resolves.toMatchObject({
        isDirectory: expect.any(Function),
      });
    });

    test('succeeds when the directory already exists', async () => {
      const existingPath = path.join(temporaryDirectory, 'existing');
      await fs.mkdir(existingPath);

      const result = await client.callTool({
        name: 'create_directory',
        arguments: { path: existingPath },
      });

      expect(result.isError).not.toBe(true);
    });

    test('rejects a path outside the allowed directory', async () => {
      const outsidePath = path.join(temporaryDirectory, '..', 'outside');

      const result = await client.callTool({
        name: 'create_directory',
        arguments: { path: outsidePath },
      });

      expect(result.isError).toBe(true);
      await expect(fs.stat(outsidePath)).rejects.toMatchObject({
        code: 'ENOENT',
      });
    });
  });
});
