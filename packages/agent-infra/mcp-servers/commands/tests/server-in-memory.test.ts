import { describe, expect, test } from 'vitest';
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
});
