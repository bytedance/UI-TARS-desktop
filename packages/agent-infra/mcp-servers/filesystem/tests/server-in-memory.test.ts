import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { createServer } from '../src/server.js';

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

  describe('search_files exclusions', () => {
    const defaultExcludedDirectories = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '.nuxt',
      'coverage',
      '.nyc_output',
      'logs',
      '.cache',
      'tmp',
      'temp',
    ];

    let client: Client;
    let temporaryDirectory: string;

    beforeAll(async () => {
      temporaryDirectory = await fs.mkdtemp(
        path.join(os.tmpdir(), 'mcp-filesystem-search-'),
      );
      await Promise.all(
        [
          ...defaultExcludedDirectories,
          'brace-a',
          'custom-a.tmp',
          'custom-cache',
          'node_modules_backup',
          'visible',
        ].map((directory) =>
          fs.mkdir(path.join(temporaryDirectory, directory), {
            recursive: true,
          }),
        ),
      );
      await Promise.all([
        ...defaultExcludedDirectories.map((directory) =>
          fs.writeFile(
            path.join(temporaryDirectory, directory, 'hidden-match.txt'),
            'excluded',
          ),
        ),
        fs.writeFile(
          path.join(temporaryDirectory, 'visible', 'match.txt'),
          'visible',
        ),
        fs.writeFile(
          path.join(temporaryDirectory, 'visible', 'match.log'),
          'excluded',
        ),
        fs.writeFile(
          path.join(temporaryDirectory, 'visible', 'custom.tmp'),
          'custom',
        ),
        fs.writeFile(
          path.join(temporaryDirectory, 'custom-a.tmp', 'glob-hidden.txt'),
          'custom',
        ),
        fs.writeFile(
          path.join(temporaryDirectory, 'brace-a', 'brace-hidden.txt'),
          'custom',
        ),
        fs.writeFile(path.join(temporaryDirectory, 'visible', '.DS_Store'), ''),
        fs.writeFile(path.join(temporaryDirectory, 'visible', 'Thumbs.db'), ''),
      ]);

      client = new Client({
        name: 'search test client',
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

    async function search(pattern: string, excludePatterns?: string[]) {
      const result = await client.callTool({
        name: 'search_files',
        arguments: {
          path: temporaryDirectory,
          pattern,
          ...(excludePatterns && { excludePatterns }),
        },
      });
      return (result.content as Array<{ type: 'text'; text: string }>)[0].text;
    }

    test('applies the default exclusions before traversing', async () => {
      const result = await search('');

      expect(result.split('\n').sort()).toEqual(
        [
          path.join(temporaryDirectory, 'brace-a'),
          path.join(temporaryDirectory, 'brace-a', 'brace-hidden.txt'),
          path.join(temporaryDirectory, 'custom-a.tmp'),
          path.join(temporaryDirectory, 'custom-a.tmp', 'glob-hidden.txt'),
          path.join(temporaryDirectory, 'custom-cache'),
          path.join(temporaryDirectory, 'node_modules_backup'),
          path.join(temporaryDirectory, 'visible'),
          path.join(temporaryDirectory, 'visible', 'custom.tmp'),
          path.join(temporaryDirectory, 'visible', 'match.txt'),
        ].sort(),
      );
    });

    test('merges custom exclusions with the defaults', async () => {
      await expect(search('cache', ['custom-cache'])).resolves.toBe(
        'No matches found',
      );
    });

    test('applies custom glob exclusions at any depth', async () => {
      await expect(search('custom.tmp', ['*.tmp'])).resolves.toBe(
        'No matches found',
      );
    });

    test.each([
      ['question-mark', 'glob-hidden.txt', 'custom-?.tmp'],
      ['brace', 'brace-hidden.txt', 'brace-{a,b}'],
    ])('preserves %s glob patterns', async (_, fileName, excludePattern) => {
      await expect(search(fileName, [excludePattern])).resolves.toBe(
        'No matches found',
      );
    });

    test('excludes exact path segments without hiding partial matches', async () => {
      await expect(search('node_modules')).resolves.toBe(
        path.join(temporaryDirectory, 'node_modules_backup'),
      );
    });
  });
});
