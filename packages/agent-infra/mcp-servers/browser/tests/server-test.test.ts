import {
  afterEach,
  beforeEach,
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createServer,
  toolsMap,
  type GlobalConfig,
  setConfig,
  BaseLogger,
} from '../src/server';
import express from 'express';
import { AddressInfo } from 'net';
import { store } from '../src/store';

describe('Browser MCP Server', () => {
  let client: Client;
  let app: express.Express;
  let httpServer: any;
  let baseUrl: string;

  beforeAll(() => {
    app = express();

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Page</h1>
            <input type="text" id="testInput" />
            <button id="testButton">Click Me</button>
            <a href="/page2">Go to Page 2</a>
            <select id="testSelect">
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
            </select>
            <button id="openPopup">Open Popup</button>
            <script>
              document.getElementById('openPopup').addEventListener('click', () => {
                const popup = window.open(
                  '/popup',
                  '_blank',
                  'width=400,height=300'
                );
              });
            </script>
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
            <h1>Page 2</h1>
            <a href="/">Back to Home</a>
          </body>
        </html>
      `);
    });

    app.get('/page3', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Page 3</title></head>
          <body>
            <h1>Page 3</h1>
            <a href="/">Back to Home</a>
          </body>
        </html>
      `);
    });

    app.get('/popup', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Popup</title>
        </head>
        <body>
          <h2>Popup</h2>
        </body>
        </html>
      `);
    });

    app.get('/dead-loop-page', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Dead Loop Page</title></head>
          <body>
            <h1>Prevent web crawling</h1>
            <a href="/">Back to Home</a>
            <script>
              while(true) {}
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
    // reset browser states
    await client.callTool({
      name: 'browser_close',
    });
    await client.close();
  });

  describe('Server Configuration', () => {
    test('should list all available tools', async () => {
      const result = await client.listTools();
      expect(result.tools.map((tool) => tool.name).sort()).toMatchSnapshot();
    });

    test('should initialize with custom config', async () => {
      const customServer = createServer({
        launchOptions: {
          headless: true,
          args: ['--no-sandbox'],
        },
        contextOptions: {
          userAgent: 'Custom User Agent',
        },
      } as GlobalConfig);
      expect(customServer).toBeDefined();
    });
  });

  describe('Navigation Operations', () => {
    test('should navigate to URL successfully', async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });
      expect(result.isError).toBe(false);
    });

    test('should handle navigation to invalid URL', async () => {
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: 'invalid-url',
        },
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('Page freeze handling', () => {
    test('should return visible page', async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: {
          url: `${baseUrl}/page2`,
        },
      });

      await client.callTool({
        name: 'browser_new_tab',
        arguments: {
          url: `${baseUrl}/page3`,
        },
      });

      // should switch to the new tab
      const tabList = await client.callTool({
        name: 'browser_tab_list',
        arguments: {},
      });

      // start new page
      expect(tabList.content?.[0]?.text).toContain('Current Tab: [2] Page 3');
    });

    test(
      'should bring / to front the page',
      {
        timeout: 50000,
      },
      async () => {
        await client.callTool({
          name: 'browser_navigate',
          arguments: {
            url: baseUrl,
          },
        });

        await client.callTool({
          name: 'browser_new_tab',
          arguments: {
            url: `${baseUrl}/page2`,
          },
        });

        await Promise.race([
          client.callTool({
            name: 'browser_navigate',
            arguments: {
              url: `${baseUrl}/dead-loop-page`,
            },
          }),
          new Promise((_, reject) => setTimeout(() => reject(false), 5000)),
        ]).catch((_) => {});

        // should switch to the new tab
        const tabList = await client.callTool({
          name: 'browser_tab_list',
          arguments: {},
        });
        // start new page
        expect(tabList.content?.[0]?.text).toContain('Test Page');
      },
    );
  });

  describe('Page Interactions', () => {
    beforeEach(async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: baseUrl,
        },
      });
    });

    test('popup page should be activePage', async () => {
      const getClickableElements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(getClickableElements.content?.[0]?.text).toContain(
        '[4]<button>Open Popup</button>',
      );

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: 4,
        },
      });
      expect(clickResult?.isError).toBe(false);

      console.log(
        await client.callTool({
          name: 'browser_tab_list',
          arguments: {},
        }),
      );

      const markdown = await client.callTool({
        name: 'browser_get_markdown',
        arguments: {},
      });
      expect(markdown.content?.[0].text).toContain('Popup');
    });

    test('should interact with form elements', async () => {
      const elements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(elements.isError).toBe(false);

      const inputResult = await client.callTool({
        name: 'browser_form_input_fill',
        arguments: {
          selector: '#testInput',
          value: 'test input',
        },
      });
      expect(inputResult.isError).toBe(false);

      const selectResult = await client.callTool({
        name: 'browser_select',
        arguments: {
          selector: '#testSelect',
          value: '2',
        },
      });
      expect(selectResult.isError).toBe(false);
    });

    test('should handle navigation between pages', async () => {
      const getClickableElements = await client.callTool({
        name: 'browser_get_clickable_elements',
        arguments: {},
      });
      expect(getClickableElements.content?.[0]?.text).toContain(
        '[2]<a>Go to Page 2</a>',
      );

      const clickResult = await client.callTool({
        name: 'browser_click',
        arguments: {
          index: 2,
        },
      });
      expect(clickResult?.isError).toBe(false);

      const content = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(content.content?.[0].text).toContain('Page 2');

      const backResult = await client.callTool({
        name: 'browser_go_back',
        arguments: {},
      });
      expect(backResult.isError).toBe(false);

      const homeContent = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(homeContent.content?.[0].text).toContain('Test Page');
    });

    test('should take screenshots of specific elements', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'button-screenshot',
          selector: '#testButton',
        },
      });
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
    });
  });

  describe('Tab Management', () => {
    test('should manage multiple tabs', { timeout: 30000 }, async () => {
      // Open new tab
      const newTabResult = await client.callTool({
        name: 'browser_new_tab',
        arguments: {
          url: baseUrl,
        },
      });
      expect(newTabResult.isError).toBe(false);

      // List tabs
      const listResult = await client.callTool({
        name: 'browser_tab_list',
        arguments: {},
      });
      expect(listResult.isError).toBe(false);

      // Switch tab
      const switchResult = await client.callTool({
        name: 'browser_switch_tab',
        arguments: {
          index: 0,
        },
      });
      expect(switchResult.content?.[0]?.text).toContain('Switched to tab 0');

      // Close tab
      const closeResult = await client.callTool({
        name: 'browser_close_tab',
        arguments: {},
      });
      expect(closeResult.isError).toBe(false);
    });
  });

  describe('setConfig', () => {
    test('should set logger', async () => {
      class CustomLogger extends BaseLogger {
        // @ts-expect-error
        info(...args: any[]) {
          console.log('info', args);
        }
        // @ts-expect-error
        error(...args: any[]) {
          console.log('error', args);
        }
      }
      const mockLogger = new CustomLogger();
      await setConfig({ logger: mockLogger });
      expect(store.logger.info).toBe(mockLogger.info);
      expect(store.logger.error).toBe(mockLogger.error);
    });
  });
});
