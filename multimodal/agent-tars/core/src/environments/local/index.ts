/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  InMemoryTransport,
  Client,
  Tool,
  JSONSchema7,
  ConsoleLogger,
  MCPServerRegistry,
  AgentEventStream,
} from '@tarko/mcp-agent';
import { ResourceCleaner } from '../../utils';
import { AgentTARSOptions, BuiltInMCPServers, BuiltInMCPServerName } from '../../types';
import { BrowserGUIAgent, BrowserManager, BrowserToolsManager } from './browser';
import { SearchToolProvider } from './search';
import { FilesystemToolsManager } from './filesystem';
import { WorkspacePathResolver } from '../../shared/workspace-path-resolver';
import { AgentTARSBaseEnvironment } from '../base';

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
export class AgentTARSLocalEnvironment extends AgentTARSBaseEnvironment {
  // Component managers - owned by this environment
  private readonly browserManager: BrowserManager;
  private readonly workspacePathResolver: WorkspacePathResolver;
  private readonly resourceCleaner: ResourceCleaner;

  // Component instances
  private browserToolsManager?: BrowserToolsManager;
  private filesystemToolsManager?: FilesystemToolsManager;
  private searchToolProvider?: SearchToolProvider;
  private browserGUIAgent?: BrowserGUIAgent;
  private mcpServers: BuiltInMCPServers = {};
  private mcpClients: Partial<Record<BuiltInMCPServerName, Client>> = {};

  constructor(options: AgentTARSOptions, workspace: string, logger: ConsoleLogger) {
    super(options, workspace, logger.spawn('LocalEnvironment'));

    // Initialize environment-owned components
    this.browserManager = BrowserManager.getInstance(this.logger);
    this.browserManager.lastLaunchOptions = {
      headless: this.options.browser?.headless,
      cdpEndpoint: this.options.browser?.cdpEndpoint,
    };

    this.workspacePathResolver = new WorkspacePathResolver({ workspace });
    this.resourceCleaner = new ResourceCleaner(this.logger);
  }

  /**
   * Initialize all components
   */
  async initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: AgentEventStream.Processor,
  ): Promise<void> {
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

    // All components are now managed internally by the environment
  }

  /**
   * Initialize GUI Agent for visual browser control
   */
  private async initializeGUIAgent(eventStream?: AgentEventStream.Processor): Promise<void> {
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
    eventStream: AgentEventStream.Processor,
    isReplaySnapshot: boolean,
  ): Promise<void> {
    // Handle local browser operations
    if (
      this.options.browser?.control !== 'dom' &&
      this.browserGUIAgent &&
      this.browserManager.isLaunchingComplete()
    ) {
      if (this.browserGUIAgent.setEventStream) {
        this.browserGUIAgent.setEventStream(eventStream);
      }
      await this.browserGUIAgent.onEachAgentLoopStart(eventStream, isReplaySnapshot);
    }
  }

  /**
   * Handle tool call preprocessing (lazy browser launch and path resolution)
   */
  async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
    isReplaySnapshot?: boolean,
  ): Promise<any> {
    // Handle browser tool calls with lazy initialization
    if (toolCall.name.startsWith('browser')) {
      await this.ensureBrowserReady(isReplaySnapshot);
    }

    // Resolve workspace paths for filesystem operations
    if (this.workspacePathResolver?.hasPathParameters(toolCall.name)) {
      return this.workspacePathResolver.resolveToolPaths(toolCall.name, args);
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
    browserState: any,
  ): Promise<any> {
    // Update browser state after navigation
    if (
      toolCall.name === 'browser_navigate' &&
      this.browserManager.isLaunchingComplete() &&
      (await this.browserManager.isBrowserAlive())
    ) {
      await this.updateBrowserState(browserState);
    }

    return result;
  }

  /**
   * Handle session disposal
   */
  async onDispose(): Promise<void> {
    // Use ResourceCleaner for comprehensive cleanup
    await this.resourceCleaner.cleanup(
      this.mcpClients,
      this.mcpServers,
      this.browserManager,
      undefined, // messageHistoryDumper is handled by main class
    );

    // Clear references
    this.mcpClients = {};
    this.mcpServers = {};
  }

  /**
   * Get browser control information
   */
  getBrowserControlInfo(): { mode: string; tools: string[] } {
    if (this.browserToolsManager) {
      return {
        mode: this.browserToolsManager.getMode(),
        tools: this.browserToolsManager.getRegisteredTools(),
      };
    }
    return {
      mode: this.options.browser?.control || 'default',
      tools: [],
    };
  }

  /**
   * Get the browser manager instance
   */
  getBrowserManager(): BrowserManager {
    return this.browserManager;
  }

  /**
   * Ensure browser is ready for tool calls
   */
  private async ensureBrowserReady(isReplaySnapshot?: boolean): Promise<void> {
    if (!this.browserManager.isLaunchingComplete()) {
      if (!isReplaySnapshot) {
        await this.browserManager.launchBrowser({
          headless: this.options.browser?.headless,
          cdpEndpoint: this.options.browser?.cdpEndpoint,
        });
      }
    } else {
      const isAlive = await this.browserManager.isBrowserAlive(true);
      if (!isAlive && !isReplaySnapshot) {
        this.logger.warn('🔄 Browser recovery needed, attempting explicit recovery...');
        const recovered = await this.browserManager.recoverBrowser();
        if (!recovered) {
          this.logger.error('❌ Browser recovery failed - tool call may not work correctly');
        }
      }
    }
  }

  /**
   * Update browser state after navigation
   */
  private async updateBrowserState(browserState: any): Promise<void> {
    try {
      if (this.options.browser?.control === 'dom') {
        const response = await this.mcpClients.browser?.callTool({
          name: 'browser_screenshot',
          arguments: { highlight: true },
        });

        if (Array.isArray(response?.content)) {
          const { data, type, mimeType } = response.content[1];
          if (type === 'image') {
            browserState.currentScreenshot = `data:${mimeType};base64,${data}`;
          }
        }
      } else if (this.browserGUIAgent) {
        const { compressedBase64 } = await this.browserGUIAgent.screenshot();
        browserState.currentScreenshot = compressedBase64;
      }
    } catch (error) {
      this.logger.warn('⚠️ Failed to update browser state:', error);
    }
  }

  /**
   * Get MCP servers for cleanup
   */
  getMCPServers(): BuiltInMCPServers {
    return this.mcpServers;
  }

  /**
   * Get MCP server registry configuration for local mode
   */
  getMCPServerRegistry(): MCPServerRegistry {
    // For local mode with stdio implementation
    if (this.options.mcpImpl === 'stdio') {
      return {
        browser: {
          command: 'npx',
          args: ['-y', '@agent-infra/mcp-server-browser'],
        },
        filesystem: {
          command: 'npx',
          args: ['-y', '@agent-infra/mcp-server-filesystem', this.workspace],
        },
        commands: {
          command: 'npx',
          args: ['-y', '@agent-infra/mcp-server-commands'],
        },
        ...(this.options.mcpServers || {}),
      };
    }

    // For local mode with in-memory implementation or custom servers only
    return this.options.mcpServers || {};
  }
}
