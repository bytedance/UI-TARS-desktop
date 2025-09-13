/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// FIXME: remove enum-based logger
export { LogLevel } from '@tarko/mcp-agent-interface';
export type * from '@tarko/mcp-agent-interface';

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export { InMemoryTransport, Client, McpServer };

/**
 * Common interface for MCP clients
 */
export interface IMCPClient {
  initialize(): Promise<Tool[]>;
  callTool(toolName: string, args: unknown): Promise<unknown>;
  close(): Promise<void>;
  getTools(): Tool[];
}
