/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentOptions, MCPServerRegistry } from '@multimodal/agent';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { GlobalConfig } from '@agent-infra/mcp-server-browser';
import type { SearchSettings } from '@agent-infra/shared';

/**
 * Browser options for Agent TARS.
 */
export interface AgentTARSBrowserOptions {
  /**
   * Browser type, for now we only supports local browser.
   *
   * FIXME: support rmeote browser.
   *
   * @default 'local'
   */
  type?: 'local' | 'remote';

  /**
   * Browser's headless
   *
   * @default false
   */
  headless?: boolean;

  /**
   * Browser control solution, by default, we will use the "browser-use" solution based on DOM tree analysis.
   * By switching to "gui-agent", you can enjoy the VLM-based GUI Agent solution represented by UI-TARS.
   *
   * FIXME: support vlm solution
   *
   * @default 'browser-use'
   */
  controlSolution?: 'browser-use' | 'gui-agent';
}

/**
 * Workspace options for Agent TARS, including file-system management, commands execution scope.
 */
export interface AgentTARSWorkspaceOptions {
  /**
   * Directory to use for filesystem operations
   * Defaults to current working directory if not specified
   *
   * FIXME: consider whether this option will affect the mcp-commands's cwd.
   */
  workingDirectory?: string;
}

/**
 * Common options interface for all Agent TARS implementations
 */
export interface AgentTARSOptions extends AgentOptions {
  /**
   * Workspace settings.
   */
  workspace?: AgentTARSWorkspaceOptions;

  /**
   * Search settings.
   */
  search?: SearchSettings;

  /**
   * Browser options
   */
  browser?: AgentTARSBrowserOptions;

  /**
   * MCP implementations for built-in mcp servers.
   *
   * @default 'in-process'
   */
  mcpImpl?: 'stdio' | 'in-process';

  /**
   * Additional mcp servers that will be injected for use
   */
  mcpServers?: MCPServerRegistry;
}

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

  /**
   * Optional method to set config for browsers.
   * Only available on browser MCP modules
   */
  setConfig?: (config: GlobalConfig) => void;
}

/**
 * Built-in MCP Server shortcut name.
 */
export type BuiltInMCPServerName = 'browser' | 'filesystem' | 'commands';
export type BuiltInMCPModules = Partial<Record<BuiltInMCPServerName, InProcessMCPModule>>;
