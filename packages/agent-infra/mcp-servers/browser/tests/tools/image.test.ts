/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server.js';
import { GlobalConfig } from '../../src/typings.js';

let app: express.Express;
let httpServer: ReturnType<typeof app.listen>;
let baseUrl: string;
let client: Client;

beforeAll(async () => {
  app = express();

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Image Test Page</title></head>
        <body>
          <h1>图片测试页面</h1>
          <img id="test-image-1" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzNlNiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuekgOWbvjE8L3RleHQ+Cjwvc3ZnPg==" alt="测试图片1" style="width: 200px; height: 100px;" />
          <img class="gallery-image" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzI4YTc0NSIvPgogIDx0ZXh0IHg9IjE1MCIgeT0iODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuekgOWbvjI8L3RleHQ+Cjwvc3ZnPg==" alt="测试图片2" style="width: 300px; height: 150px;" />
          <img class="gallery-image" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmNjM0NyIvPgogIDx0ZXh0IHg9Ijc1IiB5PSIxMDUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuekgOWbvjM8L3RleHQ+Cjwvc3ZnPg==" alt="测试图片3" style="width: 150px; height: 200px;" />
        </body>
      </html>
    `);
  });

  httpServer = app.listen(0);
  const address = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Setup MCP client
  const newClient = new Client(
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
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    },
  } as GlobalConfig);

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    newClient.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  client = newClient;
});

afterAll(async () => {
  await client.callTool({
    name: 'browser_close',
    arguments: {},
  });
  httpServer?.close();
});

describe('Browser Image Dimensions Tests', () => {
  test('should get all image dimensions', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: baseUrl,
      },
    });

    const result = await client.callTool({
      name: 'browser_get_image_dimensions',
      arguments: {
        getAllImages: true,
      },
    });

    expect(result.isError).toBe(false);
    expect(result.content?.[0]?.text).toContain('页面中找到 3 张图片');

    const responseText = result.content?.[0]?.text as string;
    const imageData = JSON.parse(responseText.split(':\n')[1]);

    expect(imageData).toHaveLength(3);
    expect(imageData[0]).toMatchObject({
      index: 0,
      alt: '测试图片1',
      displayWidth: 200,
      displayHeight: 100,
    });
    expect(imageData[1]).toMatchObject({
      index: 1,
      alt: '测试图片2',
      displayWidth: 300,
      displayHeight: 150,
    });
    expect(imageData[2]).toMatchObject({
      index: 2,
      alt: '测试图片3',
      displayWidth: 150,
      displayHeight: 200,
    });
  });

  test('should get specific image dimensions by selector', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: baseUrl,
      },
    });

    const result = await client.callTool({
      name: 'browser_get_image_dimensions',
      arguments: {
        selector: '#test-image-1',
      },
    });

    expect(result.isError).toBe(false);

    const responseText = result.content?.[0]?.text as string;
    const imageData = JSON.parse(responseText.split(':\n')[1]);

    expect(imageData).toMatchObject({
      alt: '测试图片1',
      displayWidth: 200,
      displayHeight: 100,
      isLoaded: true,
    });
  });

  test('should get specific image dimensions by index', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: baseUrl,
      },
    });

    const result = await client.callTool({
      name: 'browser_get_image_dimensions',
      arguments: {
        index: 1,
      },
    });

    expect(result.isError).toBe(false);

    const responseText = result.content?.[0]?.text as string;
    const imageData = JSON.parse(responseText.split(':\n')[1]);

    expect(imageData).toMatchObject({
      index: 1,
      alt: '测试图片2',
      displayWidth: 300,
      displayHeight: 150,
      isLoaded: true,
    });
  });

  test('should handle non-existent selector', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: baseUrl,
      },
    });

    const result = await client.callTool({
      name: 'browser_get_image_dimensions',
      arguments: {
        selector: '#non-existent-image',
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toContain(
      '未找到选择器为 "#non-existent-image" 的图片元素',
    );
  });

  test('should handle non-existent index', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: baseUrl,
      },
    });

    const result = await client.callTool({
      name: 'browser_get_image_dimensions',
      arguments: {
        index: 99,
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toContain('未找到索引为 99 的图片元素');
  });

  test('should default to get all images when no parameters provided', async () => {
    await client.callTool({
      name: 'browser_navigate',
      arguments: {
        url: baseUrl,
      },
    });

    const result = await client.callTool({
      name: 'browser_get_image_dimensions',
      arguments: {},
    });

    expect(result.isError).toBe(false);
    expect(result.content?.[0]?.text).toContain('页面中找到 3 张图片');
  });
});
