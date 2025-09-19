/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { InMemoryTransport, Client, Tool, JSONSchema7, ConsoleLogger, MCPServerRegistry } from '@tarko/mcp-agent';
import { AgentTARSOptions, BuiltInMCPServers, BuiltInMCPServerName } from '../types';
import { BrowserGUIAgent, BrowserManager, BrowserToolsManager } from '../browser';
import { SearchToolProvider } from '../search';
import { FilesystemToolsManager } from '../filesystem';

// Static imports for MCP modules
// @ts-expect-error - Default esm asset has some issues
import * as browserModule from '@agent-infra/mcp-server-browser/dist/server.cjs';
import * as filesystemModule from '@agent-infra/mcp-server-filesystem';
import * as commandsModule from '@agent-infra/mcp-server-commands';

/**
 * AgentTARSLocalEnvironment - Handles local environment operations for AgentTARS
 *
 * This environment manages local browser, filesystem, and other resources,
 * providing full local functionality.
 */
export class AgentTARSLocalEnvironment {
  private logger: ConsoleLogger;
  private options: AgentTARSOptions;
  private workspace: string;
  private browserManager: BrowserManager;

  // Component instances
  private browserToolsManager?: BrowserToolsManager;
  private filesystemToolsManager?: FilesystemToolsManager;
  private searchToolProvider?: SearchToolProvider;
  private browserGUIAgent?: BrowserGUIAgent;
  private mcpServers: BuiltInMCPServers = {};
  private mcpClients: Partial<Record<BuiltInMCPServerName, Client>> = {};

  constructor(
    options: AgentTARSOptions,
    workspace: string,
    browserManager: BrowserManager,
    logger: ConsoleLogger,
  ) {
    this.options = options;
    this.workspace = workspace;
    this.browserManager = browserManager;
    this.logger = logger.spawn('Initializer');
  }

  /**
   * Initialize all components
   */
  async initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: any,
  ): Promise<{
    browserToolsManager?: BrowserToolsManager;
    filesystemToolsManager?: FilesystemToolsManager;
    searchToolProvider?: SearchToolProvider;
    browserGUIAgent?: BrowserGUIAgent;
    mcpClients: Partial<Record<BuiltInMCPServerName, Client>>;
  }> {
    const control = this.options.browser?.control || 'hybrid';

    // Initialize browser tools manager
    this.browserToolsManager = new BrowserToolsManager(this.logger, control);
    this.browserToolsManager.setBrowserManager(this.browserManager);

    // Initialize filesystem tools manager
    this.filesystemToolsManager = new FilesystemToolsManager(this.logger, {
      workspace: this.workspace,
    });

    // Initialize GUI Agent if needed
    if (control !== 'dom') {
      await this.initializeGUIAgent(eventStream);
    }

    // Initialize search tools
    if (this.options.search) {
      await this.initializeSearchTools(registerToolFn);
    }

    // Initialize MCP servers if using in-memory implementation
    if (this.options.mcpImpl === 'in-memory') {
      await this.initializeInMemoryMCP(registerToolFn);
    }

    return {
      browserToolsManager: this.browserToolsManager,
      filesystemToolsManager: this.filesystemToolsManager,
      searchToolProvider: this.searchToolProvider,
      browserGUIAgent: this.browserGUIAgent,
      mcpClients: this.mcpClients,
    };
  }

  /**
   * Initialize GUI Agent for visual browser control
   */
  private async initializeGUIAgent(eventStream?: any): Promise<void> {
    this.logger.info('🖥️ Initializing GUI Agent for visual browser control');

    this.browserGUIAgent = new BrowserGUIAgent({
      logger: this.logger,
      headless: this.options.browser?.headless,
      browser: this.browserManager.getBrowser(),
      eventStream,
    });

    if (this.browserToolsManager) {
      this.browserToolsManager.setBrowserGUIAgent(this.browserGUIAgent);
    }

    this.logger.info('✅ GUI Agent initialized successfully');
  }

  /**
   * Initialize search tools
   */
  private async initializeSearchTools(registerToolFn: (tool: Tool) => void): Promise<void> {
    this.logger.info('🔍 Initializing search tools');

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

    this.logger.info('✅ Search tools initialized successfully');
  }

  /**
   * Initialize in-memory MCP servers and clients
   */
  private async initializeInMemoryMCP(registerToolFn: (tool: Tool) => void): Promise<void> {
    this.logger.info('🔧 Initializing in-memory MCP servers');

    // Create MCP servers
    await this.createMCPServers();

    // Create and connect MCP clients
    await this.createMCPClients();

    // Configure tool managers with clients
    this.configureMCPClients();

    // Register tools from managers and clients
    await this.registerMCPTools(registerToolFn);

    this.logger.info('✅ In-memory MCP initialization complete');
  }

  /**
   * Create MCP servers with appropriate configurations
   */
  private async createMCPServers(): Promise<void> {
    const sharedBrowser = this.browserManager.getBrowser();

    this.mcpServers = {
      browser: browserModule.createServer({
        externalBrowser: sharedBrowser,
        enableAdBlocker: false,
        launchOptions: {
          headless: this.options.browser?.headless,
        },
      }),
      filesystem: filesystemModule.createServer({
        allowedDirectories: [this.workspace],
      }),
      commands: commandsModule.createServer(),
    };
  }

  /**
   * Create and connect MCP clients
   */
  private async createMCPClients(): Promise<void> {
    const clientPromises = Object.entries(this.mcpServers)
      .filter(([_, server]) => server !== null)
      .map(async ([name, server]) => {
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        const client = new Client(
          {
            name: `${name}-client`,
            version: '1.0',
          },
          {
            capabilities: {
              roots: {
                listChanged: true,
              },
            },
          },
        );

        await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

        this.mcpClients[name as BuiltInMCPServerName] = client;
        this.logger.info(`✅ Connected to ${name} MCP server`);
      });

    await Promise.all(clientPromises);
  }

  /**
   * Configure tool managers with MCP clients
   */
  private configureMCPClients(): void {
    if (this.browserToolsManager && this.mcpClients.browser) {
      this.browserToolsManager.setBrowserClient(this.mcpClients.browser);
    }

    if (this.filesystemToolsManager && this.mcpClients.filesystem) {
      this.filesystemToolsManager.setFilesystemClient(this.mcpClients.filesystem);
    }
  }

  /**
   * Register tools from managers and remaining MCP clients
   */
  private async registerMCPTools(registerToolFn: (tool: Tool) => void): Promise<void> {
    // Register browser tools
    if (this.browserToolsManager) {
      const browserTools = await this.browserToolsManager.registerTools(registerToolFn);
      this.logger.info(
        `✅ Registered ${browserTools.length} browser tools using '${this.options.browser?.control || 'default'}' strategy`,
      );
    }

    // Register filesystem tools
    if (this.filesystemToolsManager) {
      const filesystemTools = await this.filesystemToolsManager.registerTools(registerToolFn);
      this.logger.info(
        `✅ Registered ${filesystemTools.length} filesystem tools with safe filtering`,
      );
    }

    // Register remaining tools from other MCP clients
    const remainingClientPromises = Object.entries(this.mcpClients).map(async ([name, client]) => {
      if (
        (name !== 'browser' || !this.browserToolsManager) &&
        (name !== 'filesystem' || !this.filesystemToolsManager)
      ) {
        await this.registerToolsFromClient(name as BuiltInMCPServerName, client!, registerToolFn);
      }
    });

    await Promise.all(remainingClientPromises);
  }

  /**
   * Register tools from a specific MCP client
   */
  private async registerToolsFromClient(
    moduleName: BuiltInMCPServerName,
    client: Client,
    registerToolFn: (tool: Tool) => void,
  ): Promise<void> {
    try {
      const tools = await client.listTools();

      if (!tools || !Array.isArray(tools.tools)) {
        this.logger.warn(`⚠️ No tools returned from '${moduleName}' module`);
        return;
      }

      for (const tool of tools.tools) {
        const toolDefinition = new Tool({
          id: tool.name,
          description: `[${moduleName}] ${tool.description}`,
          parameters: (tool.inputSchema || { type: 'object', properties: {} }) as JSONSchema7,
          function: async (args: Record<string, unknown>) => {
            try {
              const result = await client.callTool({
                name: tool.name,
                arguments: args,
              });
              return result.content;
            } catch (error) {
              this.logger.error(`❌ Error executing tool '${tool.name}':`, error);
              throw error;
            }
          },
        });

        registerToolFn(toolDefinition);
      }

      this.logger.info(`✅ Registered ${tools.tools.length} tools from '${moduleName}'`);
    } catch (error) {
      this.logger.error(`❌ Failed to register tools from '${moduleName}':`, error);
      throw error;
    }
  }

  /**
   * Handle agent loop start (GUI Agent screenshot if needed)
   */
  async onEachAgentLoopStart(
    sessionId: string,
    eventStream: any,
    isReplaySnapshot: boolean,
    browserGUIAgent?: BrowserGUIAgent,
    browserManager?: BrowserManager,
    browserControl?: string,
  ): Promise<void> {
    // Handle local browser operations
    if (
      browserControl !== 'dom' &&
      browserGUIAgent &&
      browserManager?.isLaunchingComplete()
    ) {
      if (browserGUIAgent.setEventStream) {
        browserGUIAgent.setEventStream(eventStream);
      }
      await browserGUIAgent.onEachAgentLoopStart(eventStream, isReplaySnapshot);
    }
  }

  /**
   * Handle tool call preprocessing (lazy browser launch and path resolution)
   */
  async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
    browserManager?: BrowserManager,
    workspacePathResolver?: any,
    browserOptions?: any,
    isReplaySnapshot?: boolean,
  ): Promise<any> {
    // Handle browser tool calls with lazy initialization
    if (toolCall.name.startsWith('browser') && browserManager) {
      await this.ensureBrowserReady(browserManager, browserOptions, isReplaySnapshot);
    }

    // Resolve workspace paths for filesystem operations
    if (workspacePathResolver?.hasPathParameters(toolCall.name)) {
      return workspacePathResolver.resolveToolPaths(toolCall.name, args);
    }

    return args;
  }

  /**
   * Handle post-tool call processing (browser state updates)
   */
  async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
    browserManager?: BrowserManager,
    updateBrowserStateFn?: () => Promise<void>,
  ): Promise<any> {
    // Update browser state after navigation
    if (
      toolCall.name === 'browser_navigate' &&
      browserManager?.isLaunchingComplete() &&
      (await browserManager.isBrowserAlive()) &&
      updateBrowserStateFn
    ) {
      await updateBrowserStateFn();
    }

    return result;
  }

  /**
   * Handle session disposal
   */
  async onDispose(browserManager?: BrowserManager): Promise<void> {
    // Close browser pages before session disposal
    if (browserManager?.isLaunchingComplete()) {
      this.logger.info('🧹 Closing browser pages before session disposal');
      await browserManager.closeAllPages();
    }
  }

  /**
   * Ensure browser is ready for tool calls
   */
  private async ensureBrowserReady(
    browserManager: BrowserManager,
    browserOptions?: any,
    isReplaySnapshot?: boolean,
  ): Promise<void> {
    if (!browserManager.isLaunchingComplete()) {
      if (!isReplaySnapshot) {
        await browserManager.launchBrowser({
          headless: browserOptions?.headless,
          cdpEndpoint: browserOptions?.cdpEndpoint,
        });
      }
    } else {
      const isAlive = await browserManager.isBrowserAlive(true);
      if (!isAlive && !isReplaySnapshot) {
        this.logger.warn('🔄 Browser recovery needed, attempting explicit recovery...');
        const recovered = await browserManager.recoverBrowser();
        if (!recovered) {
          this.logger.error('❌ Browser recovery failed - tool call may not work correctly');
        }
      }
    }
  }

  /**
   * Get MCP servers for cleanup
   */
  getMCPServers(): BuiltInMCPServers {
    return this.mcpServers;
  }
}
