/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MCPServerRegistry, MCPAgentOptions } from '@multimodal/mcp-agent';
import type { LocalBrowserSearchEngine } from '@agent-infra/shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * BrowserControlMode - Available browser control strategies
 */
export type BrowserControlMode = 'mixed' | 'browser-use-only' | 'gui-agent-only';

/**
 * Browser options for Agent TARS.
 */
export interface AgentTARSBrowserOptions {
  /**
   * Browser type, for now we only supports local browser.
   *
   * FIXME: support remote browser.
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
   * Browser control solution strategy:
   * - mixed: Combines GUI Agent with complementary MCP Browser tools without handling conflicts
   * - browser-use-only: Pure DOM-based control using only MCP Browser tools
   * - gui-agent-only: Vision-based control using GUI Agent with minimal essential browser tools
   *
   * @defaultValue `'mixed'`
   */
  control?: BrowserControlMode;
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

  /**
   * Whether to isolate workspace for each session by creating a subdirectory with session ID
   * When true, creates: workingDirectory/sessionId
   * When false, uses the workingDirectory directly for all sessions
   *
   * FIXME: move to CLI only.
   *
   * @defaultValue false
   */
  isolateSessions?: boolean;
}

/**
 * Options for the planning system within Agent TARS
 */
export interface AgentTARSPlannerOptions {
  /**
   * Whether to enable the planner functionality
   * @defaultValue false
   */
  enabled?: boolean;

  /**
   * Maximum steps allowed in a plan
   * @defaultValue 3
   */
  maxSteps?: number;

  /**
   * Custom system prompt extension for the planning functionality
   * This will be appended to the default planning instructions
   */
  planningPrompt?: string;
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
   * Enable deep research/planning capabilities to help the agent
   * create and follow structured plans for complex tasks
   */
  planner?: AgentTARSPlannerOptions | boolean;

  /**
   * Experimental features configuration
   */
  experimental?: AgentTARSExperimentalOptions;
};
