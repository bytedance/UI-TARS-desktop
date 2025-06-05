/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
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
            url: 'https://www.bing.com',
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
