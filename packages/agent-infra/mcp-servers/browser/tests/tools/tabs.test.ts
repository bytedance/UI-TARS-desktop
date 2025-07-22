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

describe('Browser Tab Management Comprehensive Tests', () => {
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
          <head><title>Tab Management Test Home</title></head>
          <body>
            <h1>Tab Management Test Home</h1>
            <input type="text" placeholder="Test input" />
            <a href="/page1">Go to Page 1</a>
            <a href="/page2">Go to Page 2</a>
          </body>
        </html>
      `);
    });

    app.get('/page1', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Page 1</title></head>
          <body>
            <h1>This is Page 1</h1>
            <p>Content for page 1</p>
            <a href="/">Back to Home</a>
          </body>
        </html>
      `);
    });

    app.get('/page2', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Page 2</title></head>
          <body>
            <h1>This is Page 2</h1>
            <p>Content for page 2</p>
            <a href="/">Back to Home</a>
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
    try {
      await client.callTool({
        name: 'browser_close',
      });
      await client.close();
    } catch (error) {
      console.warn('Error closing browser in afterEach:', error);
    }
  }, 30000);

  describe('Tab Creation and Management', () => {
    test('should create new tab', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const result = await client.callTool({
        name: 'browser_new_tab',
        arguments: { url: `${baseUrl}/page1` },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Opened new tab with URL:');
    });

    test('should list all tabs', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: { url: `${baseUrl}/page1` },
      });

      const result = await client.callTool({
        name: 'browser_tab_list',
        arguments: {},
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('[0]');
      expect(result.content?.[0].text).toContain('[1]');
    });

    test('should switch between tabs', { timeout: 35000 }, async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: { url: `${baseUrl}/page1` },
      });

      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: `${baseUrl}/page1` },
      });

      const switchResult = await client.callTool({
        name: 'browser_switch_tab',
        arguments: { index: 0 },
      });
      expect(switchResult.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('Tab Management Test Home');
    });

    test('should close specific tab', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: { url: `${baseUrl}/page1` },
      });

      const closeResult = await client.callTool({
        name: 'browser_close_tab',
        arguments: { index: 1 },
      });
      expect(closeResult.isError).toBe(false);

      const listResult = await client.callTool({
        name: 'browser_tab_list',
        arguments: {},
      });
      expect(listResult.content?.[0].text).not.toContain('[1]');
    });
  });

  describe('Tab Error Handling', () => {
    test('should handle switching to non-existent tab', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const result = await client.callTool({
        name: 'browser_switch_tab',
        arguments: { index: 999 },
      });
      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain('Invalid tab index: 999');
    });

    test('should handle closing non-existent tab', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const result = await client.callTool({
        name: 'browser_close_tab',
        arguments: {},
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Closed current tab');
    });

    test.skip('should handle closing last remaining tab', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const result = await client.callTool({
        name: 'browser_close_tab',
        arguments: { index: 0 },
      });
      expect(result.isError).toBe(false);
    }, 15000);
  });

  describe('Multiple Tab Workflows', () => {
    test(
      'should handle multiple tabs with different content',
      { timeout: 35000 },
      async () => {
        await client.callTool({
          name: 'browser_navigate',
          arguments: { url: baseUrl },
        });

        await client.callTool({
          name: 'browser_new_tab',
          arguments: { url: `${baseUrl}/page1` },
        });

        await client.callTool({
          name: 'browser_navigate',
          arguments: { url: `${baseUrl}/page1` },
        });

        await client.callTool({
          name: 'browser_new_tab',
          arguments: { url: `${baseUrl}/page1` },
        });

        await client.callTool({
          name: 'browser_navigate',
          arguments: { url: `${baseUrl}/page2` },
        });

        await client.callTool({
          name: 'browser_switch_tab',
          arguments: { index: 0 },
        });

        const homeContent = await client.callTool({
          name: 'browser_get_text',
          arguments: {},
        });
        expect(homeContent.content?.[0].text).toContain(
          'Tab Management Test Home',
        );

        await client.callTool({
          name: 'browser_switch_tab',
          arguments: { index: 1 },
        });

        const page1Content = await client.callTool({
          name: 'browser_get_text',
          arguments: {},
        });
        expect(page1Content.content?.[0].text).toContain('This is Page 1');

        await client.callTool({
          name: 'browser_switch_tab',
          arguments: { index: 2 },
        });

        const page2Content = await client.callTool({
          name: 'browser_get_text',
          arguments: {},
        });
        expect(page2Content.content?.[0].text).toContain('This is Page 2');
      },
    );

    test.skip('should maintain tab state during navigation', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: 'input[type="text"]',
          value: 'Test input in tab 1',
        },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: { url: `${baseUrl}/page1` },
      });

      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: `${baseUrl}/page1` },
      });

      await client.callTool({
        name: 'browser_switch_tab',
        arguments: { index: 0 },
      });

      const result = await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: 'document.querySelector("input[type=\\"text\\"]").value;',
        },
      });
      expect(result.content?.[0].text).toContain('Test input in tab 1');
    }, 20000);
  });
});
