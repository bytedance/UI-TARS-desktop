import {
  afterEach,
  beforeEach,
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, type GlobalConfig } from '../../src/server.js';
import express from 'express';
import { AddressInfo } from 'net';

describe('Browser Evaluate Tests', () => {
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
          <head><title>Test Page</title></head>
          <body>
            <div id="test-element">Test Content</div>
            <button id="test-button">Click Me</button>
          </body>
        </html>
      `);
    });

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
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
    try {
      await client.callTool({
        name: 'browser_close',
      });
    } catch (error) {
      console.warn('Error closing browser in afterEach:', error);
    }
    await client.close();
  }, 30000);

  afterAll(() => {
    httpServer.close();
  });

  test('should execute JavaScript and return result', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: baseUrl },
    });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        script: `() => {
          return document.getElementById('test-element').textContent;
        }`,
      },
    });

    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content?.[0].text.split('\n')[1])).toBe(
      'Test Content',
    );
  });

  test('should handle JavaScript execution errors', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: baseUrl },
    });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        script: `() => {
          return nonExistentFunction();
        }`,
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content?.[0].text).toContain('Script execution failed');
  });

  test('should be able to modify DOM', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: baseUrl },
    });

    await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        script: `() => {
          const element = document.getElementById('test-element');
          element.textContent = 'Modified Content';
          return element.textContent;
        }`,
      },
    });

    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        script: `() => {
          return document.getElementById('test-element').textContent;
        }`,
      },
    });

    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content?.[0].text.split('\n')[1])).toBe(
      'Modified Content',
    );
  });
});
