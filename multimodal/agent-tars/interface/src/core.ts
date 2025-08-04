/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MCPServerRegistry, MCPAgentOptions } from '@tarko/mcp-agent-interface';

export type LocalBrowserSearchEngine = 'google' | 'bing' | 'baidu' | 'sogou';

/**
 * BrowserControlMode - Available browser control strategies
 *
 * - dom: Uses DOM-based analysis for element identification and interaction
 * - visual-grounding: Uses Visual Language Models to identify and locate UI elements from screenshots
 * - hybrid: Combines both DOM-based and visual grounding approaches
 */
export type BrowserControlMode = 'dom' | 'visual-grounding' | 'hybrid';

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
   * @defaultValue `'hybrid'`
   */
  control?: BrowserControlMode;
  /**
   * CDP endpoint to connect to, for example "http://127.0.0.1:9222/json/version
   */
  cdpEndpoint?: string;
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
 * Options for the planning system within Agent TARS
 */
export interface AgentTARSPlannerOptions {
  /**
   * Whether to enable the planner functionality
   * @defaultValue false
   */
  enable?: boolean;

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
export interface AgentTARSOptions extends MCPAgentOptions {
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
   * The default value Overrides the Agent default of 8192.
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
}
