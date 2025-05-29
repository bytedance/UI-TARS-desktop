/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AgentOptions } from '@multimodal/agent';

export interface MCPAgentOptions extends AgentOptions {
  /**
   * Custom mcp servers.
   */
  mcpServers: MCPServerRegistry;
  /**
   * Version of MCP client to use.
   * This is a config for test ONLY, DO NOT depends on it.
   *
   * - 'v1': Use the built-in MCP client (default)
   * - 'v2': Use @agent-infra/mcp-client package
   *
   * @defaultValue `'v2'`
   */
  mcpClientVersion?: 'v1' | 'v2';
}

export interface MCPClientResult {
  content: any;
}

export interface MCPServerConfig {
  /**
   * Transport: "stdio"
   * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#stdio
   */
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  /**
   * Transport: "sse" or "streaming-http"
   * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
   * @see https://modelcontextprotocol.io/specification/2024-11-05/basic/transports#http-with-sse
   */
  url?: string;
  /**
   * @see https://github.com/modelcontextprotocol/typescript-sdk/blob/bac916e804599ee9e2ecd20f56ac2677c94989f4/src/client/sse.ts#L225-L226
   */
  headers?: RequestInit['headers'];

  /**
   * Rest custom configurations.
   */
  [key: string]: unknown;
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
