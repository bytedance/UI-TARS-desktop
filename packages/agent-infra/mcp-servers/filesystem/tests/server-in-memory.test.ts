import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
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
    let workspace: string;

    beforeEach(async () => {
      workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-filesystem-'));
      client = new Client({
        name: 'test client',
        version: '1.0',
      });

      const server = createServer({ allowedDirectories: [workspace] });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

      await Promise.all([
        client.connect(clientTransport),
        server.connect(serverTransport),
      ]);
    });

    afterEach(async () => {
      await client.close();
      await fs.rm(workspace, { recursive: true, force: true });
    });

    test('creates all missing parent directories recursively', async () => {
      const nestedPath = path.join(workspace, 'missing-parent', 'child');

      await client.callTool({
        name: 'create_directory',
        arguments: { path: nestedPath },
      });

      await expect(fs.stat(nestedPath)).resolves.toMatchObject({
        isDirectory: expect.any(Function),
      });
    });

    test('does not create directories through an outside symlink', async () => {
      const outside = await fs.mkdtemp(
        path.join(os.tmpdir(), 'mcp-filesystem-outside-'),
      );
      const link = path.join(workspace, 'outside-link');

      try {
        await fs.symlink(
          outside,
          link,
          process.platform === 'win32' ? 'junction' : 'dir',
        );
        const result = await client.callTool({
          name: 'create_directory',
          arguments: { path: path.join(link, 'child') },
        });

        expect(result.isError).toBe(true);
        await expect(
          fs.stat(path.join(outside, 'child')),
        ).rejects.toMatchObject({ code: 'ENOENT' });
      } finally {
        await fs.rm(outside, { recursive: true, force: true });
      }
    });
  });
});
