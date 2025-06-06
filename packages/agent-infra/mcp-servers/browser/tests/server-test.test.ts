import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, toolsMap, type GlobalConfig } from '../src/server';

describe('Browser MCP Server', () => {
  let client: Client;
  let server: any;

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

    server = createServer({
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

  describe('Server Configuration', () => {
    test('should list all available tools', async () => {
      const result = await client.listTools();
      expect(result.tools.map((tool) => tool.name)).toEqual(
        Object.keys(toolsMap),
      );
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
    test(
      'should navigate to URL successfully',
      {
        timeout: 20000,
      },
      async () => {
        const result = await client.callTool({
          name: 'browser_navigate',
          arguments: {
            url: 'https://www.bing.com',
          },
        });
        expect(result.isError).toBe(false);
      },
    );

    test(
      'should handle navigation to invalid URL',
      {
        timeout: 20000,
      },
      async () => {
        const result = await client.callTool({
          name: 'browser_navigate',
          arguments: {
            url: 'invalid-url',
          },
        });
        expect(result.isError).toBe(true);
      },
    );
  });

  describe('Page Interactions', () => {
    beforeEach(async () => {
      await client.callTool({
        name: 'browser_navigate',
        arguments: {
          url: 'https://www.bing.com',
        },
      });
    }, 20000);

    test('should get page content in different formats', async () => {
      const htmlResult = await client.callTool({
        name: 'browser_get_html',
        arguments: {},
      });
      expect(htmlResult.isError).toBe(false);

      const textResult = await client.callTool({
        name: 'browser_get_text',
        arguments: {},
      });
      expect(textResult.isError).toBe(false);

      const markdownResult = await client.callTool({
        name: 'browser_get_markdown',
        arguments: {},
      });
      expect(markdownResult.isError).toBe(false);
    });

    test('should handle screenshots', async () => {
      const result = await client.callTool({
        name: 'browser_screenshot',
        arguments: {
          name: 'test-screenshot',
          fullPage: true,
        },
      });
      expect(result.isError).toBe(false);
    });

    test('should handle keyboard interactions', async () => {
      const result = await client.callTool({
        name: 'browser_press_key',
        arguments: {
          key: 'Enter',
        },
      });
      expect(result.isError).toBe(false);
    });
  });

  describe('Tab Management', () => {
    test(
      'should manage multiple tabs',
      {
        timeout: 20000,
      },
      async () => {
        // Open new tab
        const newTabResult = await client.callTool({
          name: 'browser_new_tab',
          arguments: {
            url: 'https://www.bing.com',
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
        expect(switchResult.isError).toBe(false);

        // Close tab
        const closeResult = await client.callTool({
          name: 'browser_close_tab',
          arguments: {},
        });
        expect(closeResult.isError).toBe(false);
      },
    );
  });

  describe('Error Handling', () => {
    test('should handle invalid tool calls', async () => {
      await expect(
        client.callTool({
          name: 'non_existent_tool',
          arguments: {},
        }),
      ).rejects.toThrow();
    });

    test('should handle invalid tool arguments', async () => {
      const result = await client.callTool({
        name: 'browser_switch_tab',
        arguments: {
          index: -1,
        },
      });
      expect(result.isError).toBe(true);
    });
  });
});
