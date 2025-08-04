/* eslint-disable @typescript-eslint/no-explicit-any */
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

export interface MCPClientResult {
  content: any;
}

/**
 * Common interface for MCP clients
 */
export interface IMCPClient {
  /**
   * Initialize the client and return available tools
   */
  initialize(): Promise<Tool[]>;

  /**
   * Call a tool with the given arguments
   */
  callTool(toolName: string, args: unknown): Promise<MCPClientResult>;

  /**
   * Close the connection to the server
   */
  close(): Promise<void>;

  /**
   * Get the list of available tools
   */
  getTools(): Tool[];
}
