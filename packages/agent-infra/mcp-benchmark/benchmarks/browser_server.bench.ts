/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { startHTTPServer } from 'mcp-proxy';
import getPort from 'get-port';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { bench, describe, beforeAll, afterAll } from 'vitest';

import { createServer } from '@agent-infra/mcp-server-browser';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { waitForReady } from '../helpers/utils';

// supergateway
let superGatewayReady = false;
const superGatewayPort = await getPort();
const superGatewayProcess: ReturnType<typeof spawn> = spawn(
  'npx',
  [
    '-y',
    'supergateway',
    '--healthEndpoint',
    '/ping',
    '--port',
    `${superGatewayPort}`,
    '--stdio',
    'mcp-server-browser',
  ],
  {
    stdio: 'pipe',
  },
);
const handleSuperGatewayStdout = (data) => {
  const message = data.toString();
  if (message.includes('[supergateway] POST messages')) {
    superGatewayReady = true;
    console.log('supergateway server is ready');
  }
};
superGatewayProcess.stdout?.on('data', handleSuperGatewayStdout);
superGatewayProcess.stderr?.on('data', handleSuperGatewayStdout);

// mcp-proxy
let mcpProxyReady = false;
const mcpProxyPort = await getPort();
const mcpProxyProcess: ReturnType<typeof spawn> = spawn(
  'uvx',
  [
    'mcp-proxy',
    '--stateless',
    `--sse-port=${mcpProxyPort}`,
    '--',
    'mcp-server-browser',
  ],
  {
    stdio: 'pipe',
  },
);
const handleMcpProxyStdout = (data) => {
  const message = data.toString();
  // console.log('message', message);
  if (message.includes('Uvicorn running on')) {
    mcpProxyReady = true;
    console.log('mcp-proxy server is ready', mcpProxyReady);
  }
};

mcpProxyProcess.stdout?.on('data', handleMcpProxyStdout);
mcpProxyProcess.stderr?.on('data', handleMcpProxyStdout);

// mcp-http-server
let mcpHttpServerReady = false;
const mcpHttpServerPort = await getPort();
const mcpHttpServerProcess: ReturnType<typeof spawn> = spawn(
  'mcp-server-browser',
  [`--port=${mcpHttpServerPort}`],
  {
    stdio: 'pipe',
  },
);
const handleMcpHttpServerStdout = (data) => {
  const message = data.toString();
  console.log('message', message);
  if (message.includes('MCP Server listening at')) {
    mcpHttpServerReady = true;
    console.log('mcp-http-server server is ready', mcpHttpServerReady);
  }
};

mcpHttpServerProcess.stdout?.on('data', handleMcpHttpServerStdout);
mcpHttpServerProcess.stderr?.on('data', handleMcpHttpServerStdout);

console.log('superGatewayPort', superGatewayPort);
console.log('mcpProxyPort', mcpProxyPort);

let mcpProxyTsReady = false;
const mcpProxyTsPort = await getPort();
const { close: mcpProxyTsClose } = await startHTTPServer({
  createServer: async () => {
    const mcpServer = createServer();
    return mcpServer;
  },
  port: mcpProxyTsPort,
});
mcpProxyTsReady = true;

beforeAll(async () => {
  await waitForReady(() => {
    console.log(
      '[waitForReady] mcpProxyReady, superGatewayReady, mcpHttpServerReady, mcpProxyTsReady',
      mcpProxyReady,
      superGatewayReady,
      mcpHttpServerReady,
      mcpProxyTsReady,
    );
    return (
      mcpProxyReady &&
      superGatewayReady &&
      mcpHttpServerReady &&
      mcpProxyTsReady
    );
  });

  console.log('beforeAll');
}, 30 * 1000);

afterAll(() => {
  console.log('afterAll');
  mcpProxyProcess.kill();
  superGatewayProcess.kill();
  mcpProxyTsClose();
  mcpHttpServerProcess.kill();
});

process.stdin.on('close', () => {
  mcpProxyProcess?.kill();
  superGatewayProcess?.kill();
  mcpProxyTsClose();
  mcpHttpServerProcess.kill();
});

describe('Transport Benchmark', () => {
  bench('StdioTransport', async () => {
    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const transport = new StdioClientTransport({
      command: 'mcp-server-browser',
      args: [],
    });
    await client.connect(transport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('SSETransport', async () => {
    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const transport = new SSEClientTransport(
      new URL(`http://127.0.0.1:${mcpHttpServerPort}/sse`),
    );
    await client.connect(transport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('StreamableHTTPTransport', async () => {
    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${mcpHttpServerPort}/mcp`),
    );
    await client.connect(transport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('InMemoryTransport', async () => {
    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });
});

describe('HTTP Proxy Benchmark', async () => {
  bench('supergateway sse', async () => {
    const client = new Client(
      {
        name: 'test client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const sseTransport = new SSEClientTransport(
      new URL(`http://127.0.0.1:${superGatewayPort}/sse`),
    );

    await client.connect(sseTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('mcp-proxy(Python) sse', async () => {
    const client = new Client(
      {
        name: 'test-2 client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    const sseTransport = new SSEClientTransport(
      new URL(`http://127.0.0.1:${mcpProxyPort}/sse`),
    );
    await client.connect(sseTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('mcp-proxy(Python) mcp', async () => {
    const client = new Client(
      {
        name: 'test-2 client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    const mcpTransport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${mcpProxyPort}/mcp`),
    );
    await client.connect(mcpTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('mcp-proxy(TypeScript) sse', async () => {
    const client = new Client(
      {
        name: 'test-2 client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    const sseTransport = new SSEClientTransport(
      new URL(`http://127.0.0.1:${mcpProxyTsPort}/sse`),
    );
    await client.connect(sseTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('mcp-proxy(TypeScript) mcp', async () => {
    const client = new Client(
      {
        name: 'test-2 client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    const mcpTransport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${mcpProxyTsPort}/stream`),
    );
    await client.connect(mcpTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('mcp-http-server mcp', async () => {
    const client = new Client(
      {
        name: 'test-2 client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    const mcpTransport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${mcpHttpServerPort}/mcp`),
    );
    await client.connect(mcpTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });

  bench('mcp-http-server sse', async () => {
    const client = new Client(
      {
        name: 'test-2 client',
        version: '1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    const mcpTransport = new SSEClientTransport(
      new URL(`http://127.0.0.1:${mcpHttpServerPort}/sse`),
    );
    await client.connect(mcpTransport);
    const tools = await client.listTools();
    if (!tools.tools.length) throw new Error('No tools found');
    await client.close();
  });
});
