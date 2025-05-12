/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AgentOptions } from '../types';

export interface MCPAgentOptions extends AgentOptions {
  /**
   * Custom mcp servers.
   */
  mcpServers: MCPServerRegistry;
  /**
   * Version of MCP client to use
   * - 'v1': Use the built-in MCP client (default)
   * - 'v2': Use @agent-infra/mcp-client package
   *
   * @default 'v1'
   */
  mcpClientVersion?: 'v1' | 'v2';
}

export interface MCPClientResult {
  content: any;
}

export interface MCPServerConfig {
  // Command based server config
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // SSE based server config
  url?: string;
  type?: 'sse';
}

export interface MCPServerRegistry {
  [serverName: string]: MCPServerConfig;
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
