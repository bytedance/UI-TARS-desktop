/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AgentOptions,
  MCPServerRegistry,
  Event,
  EventStream,
  MCPAgentOptions,
} from '@multimodal/agent';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

import type { SearchSettings, LocalBrowserSearchEngine } from '@agent-infra/shared';
import { EventType } from '@multimodal/agent';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Export event-stream related types
 */
export type { Event, EventStream };
export { EventType };

/**
 * Browser options for Agent TARS.
 */
export interface AgentTARSBrowserOptions {
  /**
   * Browser type, for now we only supports local browser.
   *
   * FIXME: support rmeote browser.
   *
   * @defaultValue `'local'`
   */
  type?: 'local' | 'remote';

  /**
   * Control browser's headless mode
   *
   * @defaultValue `false`
   */
  headless?: boolean;

  /**
   * Browser control solution, by default, we will use the "browser-use" solution based on DOM tree analysis.
   * By switching to "gui-agent", you can enjoy the VLM-based GUI Agent solution represented by UI-TARS.
   *
   * FIXME: support vlm solution
   *
   * @defaultValue `'browser-use'`
   */
  controlSolution?: 'browser-use' | 'gui-agent';
}

/**
 * Search options for Agent TARS.
 */
export interface AgentTARSSearchOptions {
  /**
   * Search provider
   * Optional value:
   *
   * @defaultValue 'browser_search'
   */
  provider: 'browser_search' | 'tavily' | 'bing_search';
  /**
   * Search result count
   *
   * @defaultValue `10`
   */
  count?: number;
  /**
   * Optional api key, required for tavily and bing_search.
   */
  apiKey?: string;
  /**
   * Optional api key, required for tavily and bing_search.
   */
  baseUrl?: string;
  /**
   * Browser search config
   */
  browserSearch?: {
    /**
     * Local broeser search engine
     *
     * @defaultValue `'google'`
     */
    engine: LocalBrowserSearchEngine;
    /**
     * Whether to open the link to crawl detail
     */
    needVisitedUrls?: boolean;
  };
}

/**
 * Workspace options for Agent TARS, including file-system management, commands execution scope.
 */
export interface AgentTARSWorkspaceOptions {
  /**
   * Directory to use for filesystem operations
   *
   * @defaultValue Defaults to current working directory if not specified
   *
   * FIXME: consider whether this option will affect the mcp-commands's cwd.
   */
  workingDirectory?: string;
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



 * In-process MCP module interface for the new architecture
 */
export interface InMemoryMCPModule {
  /**
   * Create server function that returns an MCP server instance
   * FIXME: Strict type
   */

  createServer: (config?: any) => MCPServerInterface;
}

/**
 * MCP Server interface based on the ModelContextProtocol specification
 */
export interface MCPServerInterface {
  server: McpServer;
  connect: (transport: any) => Promise<void>;
  close?: () => Promise<void>;
}

/**
 * Built-in MCP Server shortcut name.
 */
export type BuiltInMCPServerName = 'browser' | 'filesystem' | 'commands' | 'search';

export type BuiltInMCPServers = Partial<Record<BuiltInMCPServerName, MCPServerInterface>>;

/**
 * Experimental features configuration for Agent TARS
 */
export interface AgentTARSExperimentalOptions {
  /**
   * Whether to dump complete message history to a JSON file in the working directory
   * This feature is useful for debugging and development purposes
   */
  dumpMessageHistory?: boolean;
}

/**
 * Common options interface for all Agent TARS implementations
 */
export type AgentTARSOptions = Partial<MCPAgentOptions> & {
  /**
   * Workspace settings.
   */
  workspace?: AgentTARSWorkspaceOptions;

  /**
   * Search settings.
   */
  search?: AgentTARSSearchOptions;

  /**
   * Browser options
   */
  browser?: AgentTARSBrowserOptions;

  /**
   * MCP implementations for built-in mcp servers.
   */
  mcpImpl?: 'stdio' | 'in-memory';

  /**
   * Additional mcp servers that will be injected for use
   */
  mcpServers?: MCPServerRegistry;

  /**
   * Maximum number of tokens allowed in the context window.
   * The default value Overrides the Agent default of 1000.
   */
  maxTokens?: number;

  /**
   * Experimental features configuration
   */
  experimental?: AgentTARSExperimentalOptions;
};
