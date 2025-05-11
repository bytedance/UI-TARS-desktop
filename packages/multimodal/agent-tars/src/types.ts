/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * MCP Client interface based on the ModelContextProtocol specification
 * This interface represents the common structure of all MCP server clients
 */
export interface MCPClient {
  /**
   * List available tools provided by the MCP server
   */
  listTools: Client['listTools'];

  /**
   * Call a specific tool with given arguments
   */
  callTool: Client['callTool'];

  /**
   * Close the client connection
   */
  close: () => Promise<void>;

  /**
   * Ping the MCP server to check if it's available
   */
  ping: () => Client['ping'];
}

/**
 * In-process MCP module interface
 */
export interface InProcessMCPModule {
  /**
   * Client interface for interacting with MCP server functionality
   */
  client: MCPClient;

  /**
   * Optional method to set allowed directories for filesystem operations
   * Only available on filesystem MCP modules
   */
  setAllowedDirectories?: (directories: string[]) => void;
}
