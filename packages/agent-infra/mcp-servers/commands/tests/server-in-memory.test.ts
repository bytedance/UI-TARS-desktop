import { describe, expect, test, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer, evaluateCommandSafety } from '../src/server.js';
import path from 'path';

async function createConnectedClient(server: McpServer): Promise<Client> {
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

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return client;
}

describe('MCP Server in memory', () => {
  test('listTools should return a list of tools', async () => {
    const server = createServer();
    const client = await createConnectedClient(server);

    const result = await client.listTools();

    expect(result.tools.length).toBeGreaterThan(0);
  });

  test('callTool run_command should return a result', async () => {
    const server = createServer();
    const client = await createConnectedClient(server);

    const currentFileName = path.basename(__filename);
    const result = await client.callTool({
      name: 'run_command',
      arguments: {
        command: `node -e "console.log('${currentFileName}')"`,
      },
    });
    expect(JSON.stringify(result)).toMatch(currentFileName);
  });

  test('callTool run_script should return a result', async () => {
    const server = createServer();
    const client = await createConnectedClient(server);

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

  test('safety policy should require approval for destructive default rules', () => {
    const decision = evaluateCommandSafety({
      toolName: 'run_command',
      command: 'git reset --hard HEAD',
    });

    expect(decision.action).toBe('require_approval');
    expect(decision.ruleId).toBe('destructive-git-operation');
    expect(decision.approvalRequestId).toBeTruthy();
  });

  test('custom allow rules should run before destructive default rules', () => {
    const decision = evaluateCommandSafety(
      {
        toolName: 'run_command',
        command: 'git reset --hard HEAD',
      },
      {
        rules: [
          {
            id: 'allow-known-git-reset',
            action: 'allow',
            reason: 'The caller already approved this exact operation.',
            patterns: [String.raw`git\s+reset\s+--hard\s+HEAD`],
          },
        ],
      },
    );

    expect(decision.action).toBe('allow');
  });

  test('run_command should return an approval request without executing', async () => {
    const server = createServer({
      safety: {
        rules: [
          {
            id: 'test-command-approval',
            action: 'require_approval',
            reason: 'Test command requires user approval.',
            patterns: [String.raw`node\s+-e`],
          },
        ],
      },
    });
    const client = await createConnectedClient(server);

    const result = await client.callTool({
      name: 'run_command',
      arguments: {
        command: `node -e "console.log('EXECUTED_COMMAND')"`,
      },
    });

    const serialized = JSON.stringify(result);
    expect(result.isError).toBe(true);
    expect(serialized).toContain('approval_required');
    expect(serialized).toContain('test-command-approval');
    expect(serialized).not.toContain('EXECUTED_COMMAND');
  });

  test('run_command should publish approval requests to the producer hook', async () => {
    const onApprovalRequired = vi.fn();
    const server = createServer({
      safety: {
        rules: [
          {
            id: 'test-command-approval',
            action: 'require_approval',
            reason: 'Test command requires user approval.',
            patterns: [String.raw`node\s+-e`],
          },
        ],
      },
      approvals: {
        onApprovalRequired,
        now: () => new Date('2026-05-26T00:00:00.000Z'),
      },
    });
    const client = await createConnectedClient(server);

    const result = await client.callTool({
      name: 'run_command',
      arguments: {
        command: `node -e "console.log('EXECUTED_COMMAND')"`,
        cwd: '/repo',
      },
    });

    expect(result.isError).toBe(true);
    expect(onApprovalRequired).toHaveBeenCalledTimes(1);
    expect(onApprovalRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Approve command: node -e "console.log(\'EXECUTED_COMMAND\')"',
        reason: 'Test command requires user approval.',
        source: 'commands',
        riskLevel: 'medium',
        ruleId: 'test-command-approval',
        createdAt: '2026-05-26T00:00:00.000Z',
        subject: expect.objectContaining({
          toolName: 'run_command',
          command: `node -e "console.log('EXECUTED_COMMAND')"`,
          cwd: '/repo',
        }),
      }),
    );
  });

  test('approved approval requests should execute on retry', async () => {
    const onApprovalRequired = vi.fn();
    const server = createServer({
      safety: {
        rules: [
          {
            id: 'test-command-approval',
            action: 'require_approval',
            reason: 'Test command requires user approval.',
            patterns: [String.raw`APPROVED_COMMAND`],
          },
        ],
      },
      approvals: {
        getDecision: () => 'approved',
        onApprovalRequired,
      },
    });
    const client = await createConnectedClient(server);

    const result = await client.callTool({
      name: 'run_command',
      arguments: {
        command: `node -e "console.log('APPROVED_COMMAND')"`,
      },
    });

    expect(result.isError).toBe(false);
    expect(JSON.stringify(result)).toContain('APPROVED_COMMAND');
    expect(onApprovalRequired).not.toHaveBeenCalled();
  });

  test('run_script should return an approval request without executing', async () => {
    const server = createServer({
      safety: {
        rules: [
          {
            id: 'test-script-approval',
            action: 'require_approval',
            reason: 'Test script requires user approval.',
            patterns: [String.raw`EXECUTED_SCRIPT`],
          },
        ],
      },
    });
    const client = await createConnectedClient(server);

    const result = await client.callTool({
      name: 'run_script',
      arguments: {
        interpreter: 'node',
        script: "console.log('EXECUTED_SCRIPT');",
      },
    });

    const serialized = JSON.stringify(result);
    expect(result.isError).toBe(true);
    expect(serialized).toContain('approval_required');
    expect(serialized).toContain('test-script-approval');
    expect(serialized).not.toContain('EXECUTED_SCRIPT');
  });

  test('run_command prompt should return an approval request without executing', async () => {
    const server = createServer();
    const client = await createConnectedClient(server);

    const result = await client.getPrompt({
      name: 'run_command',
      arguments: {
        command: 'git reset --hard HEAD',
      },
    });

    const serialized = JSON.stringify(result);
    expect(serialized).toContain('approval_required');
    expect(serialized).toContain('destructive-git-operation');
  });
});
