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
import { createServer, type GlobalConfig } from '../../src/server';
import express from 'express';
import { AddressInfo } from 'net';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('Browser Screenshot Comprehensive Tests', () => {
  let client: Client;
  let app: express.Express;
  let httpServer: ReturnType<typeof app.listen>;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Screenshot Test Page</title></head>
          <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
            <h1 id="mainTitle" style="color: blue; background: yellow; padding: 10px;">Main Title</h1>

            <div id="contentBox" style="width: 300px; height: 200px; background: lightblue; border: 2px solid navy; margin: 20px 0;">
              <p style="padding: 20px;">This is a content box for screenshot testing.</p>
            </div>

            <button id="screenshotButton" style="background: red; color: white; padding: 10px 20px; border: none; border-radius: 5px;">
              Screenshot Me
            </button>

            <img id="testImage" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iZ3JlZW4iLz4KICA8dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlRlc3Q8L3RleHQ+Cjwvc3ZnPg==" alt="Test Image" style="margin: 20px 0;" />

            <table id="testTable" style="border-collapse: collapse; margin: 20px 0;">
              <tr>
                <th style="border: 1px solid black; padding: 8px; background: lightgray;">Header 1</th>
                <th style="border: 1px solid black; padding: 8px; background: lightgray;">Header 2</th>
              </tr>
              <tr>
                <td style="border: 1px solid black; padding: 8px;">Cell 1</td>
                <td style="border: 1px solid black; padding: 8px;">Cell 2</td>
              </tr>
            </table>

            <div id="longContent" style="height: 2000px; background: linear-gradient(to bottom, red, blue); color: white; padding: 20px;">
              <h2>Long Content for Full Page Screenshots</h2>
              <p>This content extends beyond the viewport to test full page screenshots.</p>
              <div style="position: absolute; bottom: 20px; left: 20px;">
                <p>Content at the bottom of the page</p>
              </div>
            </div>
          </body>
        </html>
      `);
    });

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    await httpServer.close();
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

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: baseUrl },
    });
  });

  afterEach(async () => {
    await client.callTool({
      name: 'browser_close',
    });
    await client.close();
  });

  describe('Basic Screenshot Functionality', () => {
    test('should take full page screenshot', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'full-page-test',
          fullPage: true,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content?.[0].type).toBe('text');
      expect(result.content?.[1].type).toBe('image');
      expect(result.content?.[1].mimeType).toBe('image/png');
      expect(result.content?.[0].text).toContain(
        'Screenshot of the whole page taken',
      );
    });

    test('should take viewport screenshot', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'viewport-test',
          fullPage: false,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content?.[0].text).toContain(
        "Screenshot 'viewport-test' taken",
      );
    });

    test('should take screenshot with default name', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {},
      });

      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain(
        "Screenshot 'undefined' taken",
      );
    });
  });

  describe('Element-Specific Screenshots', () => {
    test('should take screenshot of specific element by selector', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'title-element',
          selector: '#mainTitle',
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content?.[0].text).toContain(
        "Screenshot 'title-element' taken",
      );
    });

    test('should take screenshot of element by index', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(elements.isError).toBe(false);

      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'element-by-index',
          index: 0,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
    });

    test('should handle non-existent selector', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'non-existent',
          selector: '#nonExistentElement',
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
    });

    test('should handle invalid element index', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'invalid-index',
          index: 999,
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain(
        'Cannot read properties of undefined',
      );
    });
  });

  describe('Screenshot with Highlights', () => {
    test('should take screenshot with highlights enabled', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'with-highlights',
          highlight: true,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content?.[0].text).toContain(
        "Screenshot 'with-highlights' taken",
      );
    });

    test('should take screenshot with highlights disabled', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'without-highlights',
          width: 1200,
          height: 800,
          highlight: false,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('1200x800');
    });
  });

  describe('Custom Viewport Screenshots', () => {
    test('should take screenshot with custom width and height', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'custom-size',
          width: 1200,
          height: 800,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('1200x800');
    });

    test('should take screenshot with only custom width', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'custom-width',
          width: 1000,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('1000x');
    });

    test('should take screenshot with only custom height', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'custom-height',
          height: 900,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content?.[0].text).toContain('x900');
    });
  });

  describe('Screenshot Edge Cases', () => {
    test('should handle screenshot of very small element', async () => {
      await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: `
            const smallDiv = document.createElement('div');
            smallDiv.id = 'smallElement';
            smallDiv.style.width = '1px';
            smallDiv.style.height = '1px';
            smallDiv.style.background = 'red';
            document.body.appendChild(smallDiv);
          `,
        },
      });

      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'small-element',
          selector: '#smallElement',
        },
      });

      expect(result.isError).toBe(false);
    });

    test('should handle screenshot of hidden element', async () => {
      await client.callTool({
        name: 'browser_evaluate',
        arguments: {
          script: `
            const hiddenDiv = document.createElement('div');
            hiddenDiv.id = 'hiddenElement';
            hiddenDiv.style.display = 'none';
            hiddenDiv.textContent = 'Hidden content';
            document.body.appendChild(hiddenDiv);
          `,
        },
      });

      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'hidden-element',
          selector: '#hiddenElement',
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain(
        'Node is either not visible or not an HTMLElement',
      );
    });

    test('should handle screenshot with zero dimensions', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'zero-dimensions',
          width: 0,
          height: 0,
        },
      });

      expect(result.isError).toBe(false);
    });

    test('should handle screenshot with negative dimensions', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'negative-dimensions',
          width: -100,
          height: -100,
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content?.[0].text).toContain(
        'Width and height values must be positive',
      );
    });
  });

  describe('Screenshot Performance', () => {
    test('should take multiple screenshots in sequence', async () => {
      const results: CallToolResult[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await client.callTool({
          name: 'browser_screenshot',
          arguments: {
            name: `sequence-${i}`,
          },
        });
        results.push(result as CallToolResult);
      }

      results.forEach((result, index) => {
        expect(result.isError).toBe(false);
        expect(result.content?.[0].text).toContain(`sequence-${index}`);
      });
    });

    test('should handle large full page screenshot', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'large-page',
          fullPage: true,
        },
      });

      expect(result.isError).toBe(false);
      expect(result.content?.[1].data).toBeDefined();
      expect(typeof result.content?.[1].data).toBe('string');
    }, 10000);
  });
});
