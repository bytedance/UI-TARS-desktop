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

  /**
   * AIO Sandbox endpoint URL for remote execution
   * When provided, disables local resource operations and connects to AIO sandbox MCP
   */
  aioSandbox?: string;
}

/**
 * Runtime settings interface for Agent TARS
 * Simplified configuration that can be adjusted by users in the UI
 */
export interface AgentTARSRuntimeSettings {
  /**
   * Browser control mode
   */
  browserMode?: BrowserControlMode;
  
  /**
   * Search provider selection
   */
  searchProvider?: 'browser_search' | 'tavily' | 'bing_search';
  
  /**
   * Search engine for browser search
   */
  searchEngine?: LocalBrowserSearchEngine;
  
  /**
   * Enable planner functionality
   */
  enablePlanner?: boolean;
  
  /**
   * Maximum planning steps
   */
  plannerMaxSteps?: number;
  
  /**
   * Browser headless mode
   */
  browserHeadless?: boolean;
  
  /**
   * Verbose mode for detailed explanations
   */
  verboseMode?: boolean;
  
  /**
   * Enable experimental features
   */
  enableExperimentalFeatures?: boolean;
}

/**
 * Default runtime settings configuration for Agent TARS
 */
export const DEFAULT_TARS_RUNTIME_SETTINGS = {
  schema: {
    type: 'object',
    properties: {
      browserMode: {
        type: 'string',
        title: 'Browser Control Mode',
        description: 'Strategy for browser interaction and control',
        enum: ['dom', 'visual-grounding', 'hybrid'],
        default: 'hybrid'
      },
      searchProvider: {
        type: 'string',
        title: 'Search Provider',
        description: 'Service to use for web searches',
        enum: ['browser_search', 'tavily', 'bing_search'],
        default: 'browser_search'
      },
      searchEngine: {
        type: 'string',
        title: 'Search Engine',
        description: 'Search engine for browser-based searches',
        enum: ['google', 'bing', 'baidu', 'sogou'],
        default: 'google'
      },
      enablePlanner: {
        type: 'boolean',
        title: 'Enable Planner',
        description: 'Use planning capabilities for complex tasks',
        default: false
      },
      plannerMaxSteps: {
        type: 'string',
        title: 'Max Planning Steps',
        description: 'Maximum steps allowed in planning',
        enum: ['3', '5', '10'],
        default: '3'
      },
      browserHeadless: {
        type: 'boolean',
        title: 'Headless Browser',
        description: 'Run browser in headless mode (no UI)',
        default: false
      },
      verboseMode: {
        type: 'boolean',
        title: 'Verbose Mode',
        description: 'Provide detailed explanations and reasoning',
        default: false
      },
      enableExperimentalFeatures: {
        type: 'boolean',
        title: 'Experimental Features',
        description: 'Enable cutting-edge features (may be unstable)',
        default: false
      }
    }
  },
  transform: (runtimeSettings: AgentTARSRuntimeSettings): Partial<AgentTARSOptions> => {
    const result: Partial<AgentTARSOptions> = {};
    
    // Browser configuration
    if (runtimeSettings.browserMode || runtimeSettings.browserHeadless !== undefined) {
      result.browser = {
        control: runtimeSettings.browserMode || 'hybrid',
        headless: runtimeSettings.browserHeadless ?? false
      };
    }
    
    // Search configuration
    if (runtimeSettings.searchProvider || runtimeSettings.searchEngine) {
      result.search = {
        provider: runtimeSettings.searchProvider || 'browser_search',
        browserSearch: {
          engine: runtimeSettings.searchEngine || 'google'
        }
      };
    }
    
    // Planner configuration
    if (runtimeSettings.enablePlanner !== undefined || runtimeSettings.plannerMaxSteps) {
      if (runtimeSettings.enablePlanner) {
        result.planner = {
          enable: true,
          maxSteps: parseInt(runtimeSettings.plannerMaxSteps || '3')
        };
      } else {
        result.planner = false;
      }
    }
    
    // Experimental features
    if (runtimeSettings.enableExperimentalFeatures !== undefined) {
      result.experimental = {
        dumpMessageHistory: runtimeSettings.enableExperimentalFeatures
      };
    }
    
    // Adjust max tokens based on verbose mode
    if (runtimeSettings.verboseMode !== undefined) {
      result.maxTokens = runtimeSettings.verboseMode ? 16384 : 8192;
    }
    
    return result;
  }
};
