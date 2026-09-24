/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js';

const { constructClient, initializeClient, closeClient, getClientTools } = vi.hoisted(() => ({
  constructClient: vi.fn<(serverName: string) => void>(),
  initializeClient: vi.fn<(serverName: string) => Promise<MCPTool[]>>(),
  closeClient: vi.fn<(serverName: string) => Promise<void>>(),
  getClientTools: vi.fn<(serverName: string) => MCPTool[]>(),
}));

vi.mock('../src/mcp-client-v2', () => ({
  MCPClientV2: class {
    constructor(private serverName: string) {
      constructClient(serverName);
    }

    initialize() {
      return initializeClient(this.serverName);
    }

    close() {
      return closeClient(this.serverName);
    }

    getTools() {
      return getClientTools(this.serverName);
    }

    callTool() {
      return Promise.resolve(undefined);
    }
  },
}));

import { MCPAgent } from '../src/mcp-agent';

const healthyTool: MCPTool = {
  name: 'healthy_tool',
  description: 'A tool from the healthy server',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

describe('MCPAgent initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    constructClient.mockImplementation(() => undefined);
    initializeClient.mockImplementation(async (serverName) => {
      if (serverName === 'broken') {
        throw new Error('connection refused');
      }

      return [healthyTool];
    });
    closeClient.mockResolvedValue(undefined);
    getClientTools.mockImplementation((serverName) =>
      serverName === 'healthy' ? [healthyTool] : [],
    );
  });

  it('surfaces a failed server and continues initializing the remaining servers', async () => {
    const agent = new MCPAgent({
      mcpServers: {
        broken: { command: 'broken-server' },
        healthy: { command: 'healthy-server' },
      },
    });

    await expect(agent.initialize()).resolves.toBeUndefined();

    expect(initializeClient).toHaveBeenNthCalledWith(1, 'broken');
    expect(initializeClient).toHaveBeenNthCalledWith(2, 'healthy');
    expect(closeClient).toHaveBeenCalledWith('broken');
    expect(agent.getTools().map((tool) => tool.name)).toEqual(['healthy_tool']);

    const errorEvents = agent
      .getEventStream()
      .getEvents()
      .filter((event) => event.type === 'system' && event.level === 'error');

    expect(errorEvents).toEqual([
      expect.objectContaining({
        type: 'system',
        level: 'error',
        message: 'Failed to initialize MCP server "broken": connection refused',
        details: {
          source: 'mcp',
          phase: 'initialization',
          serverName: 'broken',
        },
      }),
    ]);
  });

  it('surfaces client construction failures without blocking later servers', async () => {
    constructClient.mockImplementation((serverName) => {
      if (serverName === 'broken') {
        throw new Error('invalid transport configuration');
      }
    });

    const agent = new MCPAgent({
      mcpServers: {
        broken: { command: 'broken-server' },
        healthy: { command: 'healthy-server' },
      },
    });

    await expect(agent.initialize()).resolves.toBeUndefined();

    expect(initializeClient).toHaveBeenCalledOnce();
    expect(initializeClient).toHaveBeenCalledWith('healthy');
    expect(closeClient).not.toHaveBeenCalledWith('broken');
    expect(agent.getTools().map((tool) => tool.name)).toEqual(['healthy_tool']);
    expect(agent.getEventStream().getEvents()).toEqual([
      expect.objectContaining({
        type: 'system',
        level: 'error',
        message: 'Failed to initialize MCP server "broken": invalid transport configuration',
        details: {
          source: 'mcp',
          phase: 'initialization',
          serverName: 'broken',
        },
      }),
    ]);
  });
});
