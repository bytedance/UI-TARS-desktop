import { describe, expect, test, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import path from 'path';

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

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.listTools();

    expect(result.tools.length).toBeGreaterThan(0);
  });

  test('callTool run_command should return a result', async () => {
    const client = new Client({
      name: 'test client',
      version: '1.0',
    });

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.callTool({
      name: 'run_command',
      arguments: {
        command: `ls ${__dirname}`,
      },
    });
    const currentFileName = path.basename(__filename);
    expect(JSON.stringify(result)).toMatch(currentFileName);
  });

  test('callTool run_script should return a result', async () => {
    const client = new Client({
      name: 'test client',
      version: '1.0',
    });

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.callTool({
      name: 'run_script',
      arguments: {
        interpreter: 'node',
        script: 'console.log(1+1);',
      },
    });
    expect(result).toEqual({
      content: [
        {
          name: 'STDOUT',
          text: '2\n',
          type: 'text',
        },
      ],
      isError: false,
    });
  });

  test('run_command must not write to stdout (stdout is the JSON-RPC channel for stdio transport)', async () => {
    const client = new Client({
      name: 'stdout test client',
      version: '1.0',
    });

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    // Spy on console.log directly (vitest intercepts it, so spying on
    // process.stdout.write would miss it): any call here would go to
    // process.stdout in production and corrupt the JSON-RPC stream of a
    // stdio transport.
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      // The child process writes to its own captured stdout; nothing from
      // the server itself may end up on this process' stdout.
      await client.callTool({
        name: 'run_command',
        arguments: { command: 'node -e "console.log(\'ok\')"' },
      });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    } finally {
      consoleLogSpy.mockRestore();
      await client.close();
    }
  });
});
