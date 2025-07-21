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

describe('Browser Navigation Comprehensive Tests', () => {
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
          <head><title>Home Page</title></head>
          <body>
            <h1>Welcome to Home</h1>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <form action="/submit" method="post">
              <input type="text" name="username" placeholder="Username" />
              <input type="password" name="password" placeholder="Password" />
              <button type="submit">Submit</button>
            </form>
          </body>
        </html>
      `);
    });

    app.get('/about', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>About Page</title></head>
          <body>
            <h1>About Us</h1>
            <p>This is the about page with detailed information.</p>
            <a href="/">Back to Home</a>
            <a href="/contact">Contact Us</a>
          </body>
        </html>
      `);
    });

    app.get('/contact', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Contact Page</title></head>
          <body>
            <h1>Contact Information</h1>
            <p>Email: contact@example.com</p>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </body>
        </html>
      `);
    });

    app.get('/slow-page', (req, res) => {
      setTimeout(() => {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head><title>Slow Loading Page</title></head>
            <body>
              <h1>This page loads slowly</h1>
              <p>Content loaded after delay</p>
            </body>
          </html>
        `);
      }, 2000);
    });

    app.get('/redirect-source', (req, res) => {
      res.redirect('/redirect-target');
    });

    app.get('/redirect-target', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Redirect Target</title></head>
          <body>
            <h1>You were redirected here</h1>
          </body>
        </html>
      `);
    });

    app.get('/404-test', (req, res) => {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Page Not Found</title></head>
          <body>
            <h1>404 - Page Not Found</h1>
          </body>
        </html>
      `);
    });

    app.get('/timeout-test', (req, res) => {
      setTimeout(() => {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head><title>Timeout Test Page</title></head>
            <body>
              <h1>Response after timeout</h1>
              <p>This page loads after a 5 second delay</p>
            </body>
          </html>
        `);
      }, 5000);
    });

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(() => {
    httpServer?.close();
  }, 30000);

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
    await client.callTool({
      name: 'browser_close',
    });
    await client.close();
  });

  describe('Basic Navigation', () => {
    test('should navigate to valid URLs successfully', async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Navigated to');
    });

    test('should handle malformed URLs', async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: 'not-a-valid-url',
        },
      });
      expect(result.isError).toBe(true);
    });

    test('should handle empty URL', async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: '',
        },
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('Navigation History', () => {
    test('should navigate forward and backward through history', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: `${baseUrl}/about` },
      });

      const backResult = await client.callTool({
        name: 'browser_go_back',
        arguments: {},
      });
      expect(backResult.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('Welcome to Home');

      const forwardResult = await client.callTool({
        name: 'browser_go_forward',
        arguments: {},
      });
      expect(forwardResult.isError).toBe(false);

      const aboutContent = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(aboutContent.content?.[0].text).toContain('About Us');
    }, 20000);

    test('should handle going back when no history exists', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const backResult = await client.callTool({
        name: 'browser_go_back',
        arguments: {},
      });
      expect(backResult.isError).toBe(false);
    });

    test('should handle going forward when no forward history exists', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });

      const forwardResult = await client.callTool({
        name: 'browser_go_forward',
        arguments: {},
      });
      expect(forwardResult.isError).toBe(false);
    });
  });

  describe('Page Content Retrieval', () => {
    beforeEach(async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: baseUrl },
      });
    });

    test('should get text content of page', async () => {
      const result = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Welcome to Home');
      expect(result.content?.[0].text).not.toContain('<html>');
    });

    test('should get markdown content of page', async () => {
      const result = await client.callTool({
        name: 'browser_get_markdown',
        arguments: {},
      });
      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('Welcome to Home');
    });

    test('should read all links on page', async () => {
      const result = await client.callTool({
        name: 'browser_read_links',
        arguments: {},
      });
      expect(result.isError).toBe(false);
      let links;
      try {
        links = JSON.parse(result.content?.[0].text);
      } catch (e) {
        throw new Error(
          `Failed to parse links as JSON: ${result.content?.[0].text}`,
        );
      }
      expect(links).toBeInstanceOf(Array);
      expect(links.some((link) => link.text === 'About')).toBe(true);
      expect(links.some((link) => link.text === 'Contact')).toBe(true);
    });
  });

  describe('Redirects and Special Cases', () => {
    test('should handle redirects properly', async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: `${baseUrl}/redirect-source`,
        },
      });
      expect(result.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('You were redirected here');
    });

    test('should handle 404 pages', { timeout: 35000 }, async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: `${baseUrl}/404-test`,
        },
      });
      expect(result.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('404 - Page Not Found');
    });

    test('should handle slow loading pages', { timeout: 35000 }, async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: `${baseUrl}/slow-page`,
        },
      });
      expect(result.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('This page loads slowly');
    });
  });

  describe('Navigation Timeout Handling', () => {
    test(
      'should handle navigation timeout gracefully',
      { timeout: 35000 },
      async () => {
        const result = await client.callTool({
          name: 'browser_navigate',
          arguments: {
            url: `${baseUrl}/timeout-test`,
          },
        });
        expect(result.isError).toBe(false);
        expect(result.content?.[0].text).toContain('Navigated to');
      },
    );
  });
});
