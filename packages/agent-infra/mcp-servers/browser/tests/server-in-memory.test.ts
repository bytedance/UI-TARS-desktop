/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AddressInfo } from 'net';
import { createServer, toolsMap, type GlobalConfig } from '../src/server';

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

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toEqual(
      Object.keys(toolsMap),
    );
  });

  describe('call tools', () => {
    let client: Client;
    let app: express.Express;
    let httpServer: any;
    let baseUrl: string;

    beforeAll(async () => {
      app = express();

      // 添加测试页面路由
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

      httpServer = app.listen(0); // 使用随机可用端口
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
    });

    afterEach(async () => {
      await client.close();
    });

    test(
      'browser_form_input_fill',
      {
        timeout: 20000,
      },
      async () => {
        await client.callTool({
          name: 'browser_navigate',
          arguments: {
            url: baseUrl,
          },
        });

        const result = await client.callTool({
          name: 'browser_form_input_fill',
          arguments: {
            value: 'input_value',
          },
        });
        expect(result.isError).toEqual(true);

        const resultSuccess = await client.callTool({
          name: 'browser_form_input_fill',
          arguments: {
            selector: 'input',
            value: 'input_value',
          },
        });

        expect(resultSuccess.isError).toEqual(false);
      },
    );

    test('no vision tools', async () => {
      await expect(
        client.callTool({
          name: 'browser_vision_screen_click',
          arguments: {
            x: 100,
            y: 100,
            factors: [1000, 1000],
          },
        }),
      ).rejects.toThrowError(/not found/);

      await expect(
        client.callTool({
          name: 'browser_vision_screen_capture',
          arguments: {},
        }),
      ).rejects.toThrowError(/not found/);
    });
  });

  describe('call vision tools', () => {
    let client: Client;
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
        vision: true,
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

    test('browser_vision_screen_click', async () => {
      const result = await client.callTool({
        name: 'browser_vision_screen_click',
        arguments: {
          x: 100,
          y: 100,
          factors: [1000, 1000],
        },
      });

      expect(result).toEqual({
        content: [
          {
            text: 'Vision click at 100, 100',
            type: 'text',
          },
        ],
        isError: false,
      });
    });
  });
});
