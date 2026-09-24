import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import fs from 'node:fs/promises';
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

      test('move_file should reject an existing destination', async () => {
        const tempDir = await fs.mkdtemp(
          path.join(__dirname, './fixtures/normal/move-file-'),
        );
        const sourcePath = path.join(tempDir, 'source.txt');
        const destinationPath = path.join(tempDir, 'destination.txt');

        try {
          await fs.writeFile(sourcePath, 'SOURCE');
          await fs.writeFile(destinationPath, 'KEEP_DESTINATION');

          const result = await client.callTool({
            name: 'move_file',
            arguments: {
              source: sourcePath,
              destination: destinationPath,
            },
          });

          expect(result).toMatchObject({
            isError: true,
            content: [
              {
                type: 'text',
                text: expect.stringContaining('Destination already exists'),
              },
            ],
          });
          expect(await fs.readFile(sourcePath, 'utf8')).toBe('SOURCE');
          expect(await fs.readFile(destinationPath, 'utf8')).toBe(
            'KEEP_DESTINATION',
          );
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });

      test('move_file should move to a new destination', async () => {
        const tempDir = await fs.mkdtemp(
          path.join(__dirname, './fixtures/normal/move-file-'),
        );
        const sourcePath = path.join(tempDir, 'source.txt');
        const destinationPath = path.join(tempDir, 'destination.txt');

        try {
          await fs.writeFile(sourcePath, 'SOURCE');

          const result = await client.callTool({
            name: 'move_file',
            arguments: {
              source: sourcePath,
              destination: destinationPath,
            },
          });

          expect(result).toEqual({
            content: [
              {
                type: 'text',
                text: `Successfully moved ${sourcePath} to ${destinationPath}`,
              },
            ],
          });
          expect(await fs.readFile(destinationPath, 'utf8')).toBe('SOURCE');
          await expect(fs.access(sourcePath)).rejects.toMatchObject({
            code: 'ENOENT',
          });
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      });
    });
  });
});
