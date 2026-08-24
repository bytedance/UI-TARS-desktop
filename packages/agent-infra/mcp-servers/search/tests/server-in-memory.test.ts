/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { SearchProvider } from '@agent-infra/shared';
import { createServer } from '../src/server.js';

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

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.listTools();

    expect(result.tools.length).toEqual(1);
    expect(result.tools[0].name).toEqual('web_search');
    expect(result.tools[0].description).toEqual(
      'Search the web or X posts with the configured provider',
    );
  });

  test('registry metadata exposes Xquik configuration', async () => {
    const metadata = JSON.parse(
      await readFile(new URL('../server.json', import.meta.url), 'utf8'),
    );

    expect(metadata.version).toBe('1.3.0');
    for (const packageEntry of metadata.packages) {
      expect(packageEntry.version).toBe('1.3.0');
      expect(
        packageEntry.package_arguments.map(
          (argument: { name: string }) => argument.name,
        ),
      ).toEqual(
        expect.arrayContaining(['provider', 'count', 'api-key', 'base-url']),
      );
      expect(packageEntry.environment_variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'X_TWITTER_SCRAPER_API_KEY',
            is_secret: true,
          }),
        ]),
      );
    }
  });

  test('web_search returns Xquik post results', async () => {
    const requests: Array<{ apiKey?: string; url?: string }> = [];
    const apiServer = createHttpServer((request, response) => {
      requests.push({
        apiKey: request.headers['x-api-key'] as string | undefined,
        url: request.url,
      });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          has_next_page: false,
          next_cursor: '',
          tweets: [
            {
              id: '123',
              bookmarkCount: 0,
              likeCount: 8,
              quoteCount: 1,
              replyCount: 3,
              retweetCount: 5,
              text: 'Current agent search result',
              viewCount: 144,
              author: {
                id: '42',
                name: 'Ada Example',
                username: 'ada',
              },
            },
          ],
        }),
      );
    });

    await new Promise<void>((resolve) => {
      apiServer.listen(0, '127.0.0.1', resolve);
    });
    const address = apiServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not expose a TCP port');
    }

    const server = createServer({
      provider: SearchProvider.Xquik,
      providerConfig: {
        count: 2,
        engine: 'google',
      },
      apiKey: 'test-key',
      baseUrl: `http://127.0.0.1:${address.port}`,
    });
    const client = new Client({ name: 'test client', version: '1.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([
        client.connect(clientTransport),
        server.connect(serverTransport),
      ]);
      const result = await client.callTool({
        name: 'web_search',
        arguments: { query: 'agent search', count: 1 },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Search results for: "agent search"',
          name: 'QUERY',
        },
        {
          type: 'text',
          text:
            '[1] @ada: Current agent search result\n' +
            'URL: https://x.com/ada/status/123\n' +
            'Author: Ada Example (@ada)\n' +
            'Engagement: likes 8, reposts 5, replies 3, quotes 1, views 144\n\n' +
            'Current agent search result',
          name: 'RESULTS',
        },
      ]);
      expect(requests).toEqual([
        {
          apiKey: 'test-key',
          url: '/x/tweets/search?q=agent%20search&limit=1',
        },
      ]);
    } finally {
      await client.close();
      await server.close();
      await new Promise<void>((resolve, reject) => {
        apiServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
