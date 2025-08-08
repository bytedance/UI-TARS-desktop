/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentOptions, CommonFilterOptions } from '@tarko/agent-interface';

// FIXME: remove enum-based logger
export { LogLevel } from '@tarko/agent-interface';
export type * from '@tarko/agent-interface';

/**
 * MCP Server filtering options for controlling which servers are connected
 */
export interface MCPServerFilterOptions extends CommonFilterOptions {}

export interface MCPAgentOptions extends AgentOptions {
  /**
   * Custom mcp servers.
   */
  mcpServers?: MCPServerRegistry;

  /**
   * MCP server filtering options for controlling which servers are connected
   */
  mcpServer?: MCPServerFilterOptions;

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
