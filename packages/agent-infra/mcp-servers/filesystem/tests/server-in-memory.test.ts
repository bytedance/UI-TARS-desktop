import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
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

  describe('stdio protocol safety', () => {
    test('tool calls must not write to stdout (stdout is the JSON-RPC channel for stdio transport)', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'mcp-filesystem-stdout-'),
      );
      const client = new Client({
        name: 'stdout test client',
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

      // Spy on console.log directly (vitest intercepts it, so spying on
      // process.stdout.write would miss it): any call here would go to
      // process.stdout in production and corrupt the JSON-RPC stream of a
      // stdio transport.
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      try {
        // An existing file exercises the realpath branch of validatePath.
        const existingPath = path.join(tmpDir, 'existing.txt');
        await fs.writeFile(existingPath, 'existing');
        await client.callTool({
          name: 'read_file',
          arguments: { path: existingPath },
        });
        // A brand-new file exercises the parent-directory fallback branch.
        await client.callTool({
          name: 'write_file',
          arguments: { path: path.join(tmpDir, 'new.txt'), content: 'new' },
        });
        expect(consoleLogSpy).not.toHaveBeenCalled();
      } finally {
        consoleLogSpy.mockRestore();
        await client.close();
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
