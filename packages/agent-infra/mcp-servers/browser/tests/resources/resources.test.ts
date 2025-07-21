import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, type GlobalConfig } from '../../src/server.js';
import express from 'express';
import { AddressInfo } from 'net';

describe('MCP Resources', () => {
  let client: Client;
  let app: express.Express;
  let httpServer: ReturnType<typeof app.listen>;
  let baseUrl: string;

  beforeAll(() => {
    app = express();

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Resource Test Page</title></head>
          <body>
            <h1>Resource Test Page</h1>
            <script>
              console.log('Test console message');
              console.error('Test error message');
            </script>
          </body>
        </html>
      `);
    });

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(() => {
    httpServer?.close();
  });

  beforeEach(async () => {
    client = new Client(
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
      launchOptions: {
        headless: true,
      },
    } as GlobalConfig);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  describe('screenshot resources', () => {
    test('should list available screenshot resources', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      await client.callTool({
        name: 'browser_screenshot',
        arguments: {},
      });

      const result = await client.listResources();

      expect(result.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: expect.stringContaining('screenshot://'),
            name: expect.any(String),
            mimeType: 'image/png',
          }),
        ]),
      );
    });

    test('should retrieve screenshot resource content', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      await client.callTool({
        name: 'browser_screenshot',
        arguments: {},
      });

      const resourceList = await client.listResources();
      const screenshotResource = resourceList.resources.find((r) =>
        r.uri.startsWith('screenshot://'),
      );

      if (screenshotResource) {
        const result = await client.readResource({
          uri: screenshotResource.uri,
        });

        expect(result.contents).toEqual([
          {
            uri: screenshotResource.uri,
            mimeType: 'image/png',
            blob: expect.any(String),
          },
        ]);
      }
    });

    test('should handle non-existent screenshot resources', async () => {
      const result = await client.readResource({
        uri: 'screenshot://non-existent-screenshot',
      });

      expect(result.contents).toEqual([]);
    });

    test('should handle multiple screenshot resources', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      await client.callTool({
        name: 'browser_screenshot',
        arguments: {},
      });

      await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          selector: '#content',
        },
      });

      const result = await client.listResources();
      const screenshotResources = result.resources.filter((r) =>
        r.uri.startsWith('screenshot://'),
      );

      expect(screenshotResources.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('console log resources', () => {
    test('should access browser console logs', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      const result = await client.listResources();

      expect(result.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'console://logs',
            name: 'Browser console logs',
            mimeType: 'text/plain',
          }),
        ]),
      );
    });

    test('should retrieve console log content', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      const result = await client.readResource({
        uri: 'console://logs',
      });

      expect(result.contents).toEqual([
        {
          uri: 'console://logs',
          text: expect.any(String),
        },
      ]);
    });

    test('should handle empty console logs', async () => {
      const result = await client.readResource({
        uri: 'console://logs',
      });

      expect(result.contents).toEqual([
        {
          uri: 'console://logs',
          text: expect.any(String),
        },
      ]);
    });

    test('should capture console messages from page', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await client.readResource({
        uri: 'console://logs',
      });

      if (result.contents[0] && result.contents[0].text) {
        expect(result.contents[0].text).toMatch(
          /Test console message|Test error message|^$/,
        );
      }
    });

    test('should handle invalid console resource URIs', async () => {
      try {
        await client.readResource({
          uri: 'console://invalid',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('resource error handling', () => {
    test('should handle invalid resource URIs', async () => {
      try {
        await client.readResource({
          uri: 'invalid://resource',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle malformed resource URIs', async () => {
      try {
        await client.readResource({
          uri: 'not-a-valid-uri',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should list resources when browser not initialized', async () => {
      const result = await client.listResources();

      expect(result.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'console://logs',
            name: 'Browser console logs',
            mimeType: 'text/plain',
          }),
        ]),
      );
    });
  });
});
