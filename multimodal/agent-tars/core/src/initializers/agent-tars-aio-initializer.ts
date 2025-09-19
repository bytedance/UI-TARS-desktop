/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger, MCPServerRegistry } from '@tarko/mcp-agent';
import { AgentTARSOptions, BuiltInMCPServers, BuiltInMCPServerName } from '../types';
import { BrowserGUIAgent, BrowserManager, BrowserToolsManager } from '../browser';
import { SearchToolProvider } from '../search';
import { FilesystemToolsManager } from '../filesystem';

/**
 * AgentTARSAIOInitializer - Handles initialization for AIO Sandbox environment
 *
 * This initializer disables local resource operations and relies on AIO Sandbox MCP
 * for all tool functionality when aioSandbox option is provided.
 */
export class AgentTARSAIOInitializer {
  private logger: ConsoleLogger;
  private options: AgentTARSOptions;
  private workspace: string;
  private browserManager: BrowserManager;

  // Component instances (minimal for AIO mode)
  private searchToolProvider?: SearchToolProvider;
  private mcpServerRegistry: MCPServerRegistry = {};
  private mcpClients: Partial<Record<BuiltInMCPServerName, any>> = {};

  constructor(
    options: AgentTARSOptions,
    workspace: string,
    browserManager: BrowserManager,
    logger: ConsoleLogger,
  ) {
    this.options = options;
    this.workspace = workspace;
    this.browserManager = browserManager;
    this.logger = logger.spawn('AIOInitializer');
  }

  /**
   * Initialize components for AIO Sandbox mode
   */
  async initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: any,
  ): Promise<{
    browserToolsManager?: BrowserToolsManager;
    filesystemToolsManager?: FilesystemToolsManager;
    searchToolProvider?: SearchToolProvider;
    browserGUIAgent?: BrowserGUIAgent;
    mcpClients: Partial<Record<BuiltInMCPServerName, any>>;
  }> {
    this.logger.info('🌐 Initializing AgentTARS in AIO Sandbox mode');
    this.logger.info(`🔗 AIO Sandbox endpoint: ${this.options.aioSandbox}`);

    // Setup MCP servers for AIO mode
    this.setupAIOMCPServers();

    // Initialize only search tools for AIO mode
    // All other tools (browser, filesystem, commands) are provided by AIO Sandbox MCP
    if (this.options.search) {
      await this.initializeSearchTools(registerToolFn);
    }

    this.logger.info('✅ AIO Sandbox initialization complete - local resources disabled');

    return {
      searchToolProvider: this.searchToolProvider,
      mcpClients: this.mcpClients,
    };
  }

  /**
   * Setup MCP servers for AIO Sandbox mode
   */
  private setupAIOMCPServers(): void {
    this.logger.info('🔧 Setting up AIO Sandbox MCP connection');
    
    // Configure MCP servers to connect to AIO Sandbox
    // Note: This will be used by the parent MCPAgent class
    this.mcpServerRegistry = {
      aio: {
        url: `${this.options.aioSandbox}/mcp`,
      },
      // Include any additional user-provided MCP servers
      ...(this.options.mcpServers || {}),
    };

    this.logger.info('✅ AIO Sandbox MCP servers configured');
  }

  /**
   * Initialize search tools (only component that works in AIO mode)
   */
  private async initializeSearchTools(registerToolFn: (tool: Tool) => void): Promise<void> {
    this.logger.info('🔍 Initializing search tools for AIO mode');

    this.searchToolProvider = new SearchToolProvider(this.logger, {
      provider: this.options.search!.provider,
      count: this.options.search!.count,
      cdpEndpoint: this.options.browser?.cdpEndpoint,
      browserSearch: this.options.search!.browserSearch,
      apiKey: this.options.search!.apiKey,
      baseUrl: this.options.search!.baseUrl,
    });

    const searchTool = this.searchToolProvider.createSearchTool();
    registerToolFn(searchTool);

    this.logger.info('✅ Search tools initialized for AIO mode');
  }

  /**
   * Get MCP servers registry for the MCPAgent
   */
  getMCPServerRegistry(): MCPServerRegistry {
    return this.mcpServerRegistry;
  }

  /**
   * Get MCP servers for cleanup
   */
  getMCPServers(): BuiltInMCPServers {
    return {}; // No local MCP servers in AIO mode
  }
}
