/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  InMemoryTransport,
  Client,
  AgentEventStream,
  Tool,
  JSONSchema7,
  MCPAgent,
  MCPServerRegistry,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  ConsoleLogger,
  LoopTerminationCheckResult,
  PrepareRequestContext,
  PrepareRequestResult,
} from '@mcp-agent/core';
import {
  AgentTARSOptions,
  BuiltInMCPServers,
  BuiltInMCPServerName,
  AgentTARSPlannerOptions,
  BrowserState,
} from './types';
import { DEFAULT_SYSTEM_PROMPT, generateBrowserRulesPrompt } from './prompt';
import { BrowserGUIAgent, BrowserManager, BrowserToolsManager } from './browser';
import { validateBrowserControlMode } from './browser/browser-control-validator';
import { SearchToolProvider } from './search';
import { applyDefaultOptions } from './shared/config-utils';
import { MessageHistoryDumper } from './shared/message-history-dumper';
import { PlannerManager } from './planner';

// @ts-expect-error
// Default esm asset has some issues {@see https://github.com/bytedance/UI-TARS-desktop/issues/672}
import * as browserModule from '@agent-infra/mcp-server-browser/dist/server.cjs';
import * as filesystemModule from '@agent-infra/mcp-server-filesystem';
import * as commandsModule from '@agent-infra/mcp-server-commands';

/**
 * A Agent TARS that uses in-memory MCP tool call
 * for built-in MCP Servers.
 */
export class AgentTARS<T extends AgentTARSOptions = AgentTARSOptions> extends MCPAgent<T> {
  private workingDirectory: string;
  // FIXME: remove it since options is strict type already
  private tarsOptions: AgentTARSOptions;
  private mcpServers: BuiltInMCPServers = {};
  private inMemoryMCPClients: Partial<Record<BuiltInMCPServerName, Client>> = {};
  private browserGUIAgent?: BrowserGUIAgent;
  private browserManager: BrowserManager;
  private browserToolsManager?: BrowserToolsManager;
  private searchToolProvider?: SearchToolProvider;
  private browserState: BrowserState = {};
  private plannerManager?: PlannerManager;
  private plannerOptions?: AgentTARSPlannerOptions;

  // Message history dumper for experimental dump feature
  private messageHistoryDumper?: MessageHistoryDumper;

  constructor(options: T) {
    // Apply default config using the new utility function
    const tarsOptions = applyDefaultOptions<AgentTARSOptions>(options);

    // Validate browser control mode based on model provider
    if (tarsOptions.browser?.control) {
      const modelProvider = tarsOptions.model?.provider || tarsOptions.model?.providers?.[0]?.name;
      tarsOptions.browser.control = validateBrowserControlMode(
        modelProvider,
        tarsOptions.browser.control,
        new ConsoleLogger(options.id || 'AgentTARS'),
      );
    }

    const { workingDirectory = process.cwd() } = tarsOptions.workspace!;

    // Under the 'in-memory' implementation, the built-in mcp server will be implemented independently
    // Note that the usage of the attached mcp server will be the same as the implementation,
    // because we cannot determine whether it supports same-process calls.
    const mcpServers: MCPServerRegistry = {
      ...(options.mcpImpl === 'stdio'
        ? {
            browser: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-browser'],
            },
            filesystem: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-filesystem', workingDirectory],
            },
            commands: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-commands'],
            },
          }
        : {}),
      ...(options.mcpServers || {}),
    };

    // Initialize planner options if enabled
    const plannerOptions: AgentTARSPlannerOptions | undefined =
      typeof tarsOptions.planner === 'boolean'
        ? tarsOptions.planner
          ? { enable: true }
          : undefined
        : tarsOptions.planner;

    // Generate browser rules based on control solution
    const browserRules = generateBrowserRulesPrompt(tarsOptions.browser?.control);

    // Generate planner prompt if enabled
    let plannerPrompt = '';
    if (plannerOptions?.enable) {
      plannerPrompt = `${PlannerManager.getSystemPromptAddition(plannerOptions.strategy)} \n\n ${plannerOptions.planningPrompt ?? ''}`;
    }

    const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}
${plannerPrompt ? `\n${plannerPrompt}` : ''}
${browserRules}

<envirnoment>
Current Working Directory: ${workingDirectory}
</envirnoment>

    `;

    // Prepare system instructions by combining default prompt with custom instructions
    const instructions = options.instructions
      ? `${systemPrompt}\n\n${options.instructions}`
      : systemPrompt;

    super({
      ...tarsOptions,
      name: options.name ?? 'AgentTARS',
      instructions,
      mcpServers,
      maxTokens: tarsOptions.maxTokens, // Ensure maxTokens is passed to the parent class
    });

    this.logger = this.logger.spawn('AgentTARS');
    this.tarsOptions = tarsOptions;
    this.plannerOptions = plannerOptions;
    this.workingDirectory = workingDirectory;
    this.logger.info(`🤖 AgentTARS initialized | Working directory: ${workingDirectory}`);

    // Initialize browser manager instead of direct browser instance
    this.browserManager = BrowserManager.getInstance(this.logger);
    this.browserManager.lastLaunchOptions = {
      headless: this.tarsOptions.browser?.headless,
      cdpEndpoint: this.tarsOptions.browser?.cdpEndpoint,
    };

    // Initialize planner if enabled
    if (plannerOptions?.enable) {
      this.plannerManager = new PlannerManager(
        {
          strategy: plannerOptions.strategy || 'default',
          maxSteps: plannerOptions.maxSteps || 3,
          planningPrompt: plannerOptions.planningPrompt,
          enableSearchBeforePlan: plannerOptions.enableSearchBeforePlan ?? true,
        },
        this.eventStream,
        this.logger,
      );
    }

    // Initialize message history dumper if experimental feature is enabled
    if (options.experimental?.dumpMessageHistory) {
      this.messageHistoryDumper = new MessageHistoryDumper({
        workingDirectory: this.workingDirectory,
        agentId: this.id,
        agentName: this.name,
        logger: this.logger,
      });
      this.logger.info('📝 Message history dump enabled');
    }

    this.eventStream.subscribe((event) => {
      if (event.type === 'tool_result' && event.name === 'browser_navigate') {
        event._extra = this.browserState;
      }
    });
  }

  /**
   * Initialize in-memory MCP modules and register tools
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing AgentTARS ...');

    try {
      // Initialize browser components based on control solution
      const control = this.tarsOptions.browser?.control || 'hybrid';

      // Always initialize browser tools manager regardless of control mode
      this.browserToolsManager = new BrowserToolsManager(this.logger, control);
      this.browserToolsManager.setBrowserManager(this.browserManager);

      // First initialize GUI Agent if needed
      if (control !== 'dom') {
        await this.initializeGUIAgent();
      }

      // Initialize search tools using direct integration with agent-infra/search
      await this.initializeSearchTools();

      // Then initialize MCP servers and register tools
      if (this.tarsOptions.mcpImpl === 'in-memory') {
        await this.initializeInMemoryMCPForBuiltInMCPServers();
      }

      this.logger.info('✅ AgentTARS initialization complete');
      // Log all registered tools in a beautiful format
      this.logRegisteredTools();
    } catch (error) {
      this.logger.error('❌ Failed to initialize AgentTARS:', error);
      await this.cleanup();
      throw error;
    }

    await super.initialize();
  }

  /**
   * Initialize search tools using direct integration with agent-infra/search
   */
  private async initializeSearchTools(): Promise<void> {
    try {
      this.logger.info('🔍 Initializing search tools with direct integration');

      // Get browser instance from manager for browser_search provider if needed
      // const sharedBrowser =
      //   this.tarsOptions.search?.provider === 'browser_search'
      //     ? this.browserManager.getBrowser()
      //     : undefined;

      // Create search tool provider with configuration from options
      this.searchToolProvider = new SearchToolProvider(this.logger, {
        provider: this.tarsOptions.search!.provider,
        count: this.tarsOptions.search!.count,
        cdpEndpoint: this.tarsOptions.browser!.cdpEndpoint,
        browserSearch: this.tarsOptions.search!.browserSearch,
        apiKey: this.tarsOptions.search!.apiKey,
        baseUrl: this.tarsOptions.search!.baseUrl,
        // FIXME: Un-comment it after refine launch state management of `@agent-infra/browser` and
        // externalBrowser: sharedBrowser,
      });

      // Create and register search tool
      const searchTool = this.searchToolProvider.createSearchTool();
      this.registerTool(searchTool);

      this.logger.info('✅ Search tools initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize search tools:', error);
      throw error;
    }
  }

  /**
   * Log all registered tools in a beautiful format
   */
  private logRegisteredTools(): void {
    try {
      // Get all tools from parent class
      const tools = this.getTools();

      if (!tools || tools.length === 0) {
        this.logger.info('🧰 No tools registered');
        return;
      }

      const toolCount = tools.length;

      // Create a beautiful header for the tools log
      const header = `🧰 ${toolCount} Tools Registered 🧰`;
      const separator = '═'.repeat(header.length);

      this.logger.info('\n');
      this.logger.info(separator);
      this.logger.info(header);
      this.logger.info(separator);

      // Group tools by their module/category (derived from description)
      const toolsByCategory: Record<string, string[]> = {};

      tools.forEach((tool) => {
        // Extract category from description [category] format if available
        const categoryMatch = tool.description?.match(/^\[(.*?)\]/);
        const category = categoryMatch ? categoryMatch[1] : 'general';

        if (!toolsByCategory[category]) {
          toolsByCategory[category] = [];
        }

        toolsByCategory[category].push(tool.name);
      });

      // Print tools by category
      Object.entries(toolsByCategory).forEach(([category, toolNames]) => {
        this.logger.info(`\n📦 ${category} (${toolNames.length}):`);
        toolNames.sort().forEach((name) => {
          this.logger.info(`  • ${name}`);
        });
      });

      this.logger.info('\n' + separator);
      this.logger.info(`✨ Total: ${toolCount} tools ready to use`);
      this.logger.info(separator + '\n');
    } catch (error) {
      this.logger.error('❌ Failed to log registered tools:', error);
    }
  }
  /**
   * Initialize GUI Agent for visual browser control
   */
  private async initializeGUIAgent(): Promise<void> {
    try {
      this.logger.info('🖥️ Initializing GUI Agent for visual browser control');

      // Create GUI Agent instance with browser from manager
      this.browserGUIAgent = new BrowserGUIAgent({
        logger: this.logger,
        headless: this.tarsOptions.browser?.headless,
        browser: this.browserManager.getBrowser(), // Get browser from manager
        eventStream: this.eventStream, // Pass the event stream
      });

      // Set GUI Agent in browser tools manager
      if (this.browserToolsManager) {
        this.browserToolsManager.setBrowserGUIAgent(this.browserGUIAgent);
      }

      this.logger.info('✅ GUI Agent initialized successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize GUI Agent: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize in-memory mcp for built-in mcp servers using the new architecture
   * with direct server creation and configuration
   */
  private async initializeInMemoryMCPForBuiltInMCPServers(): Promise<void> {
    try {
      // Get browser instance from manager for reuse
      const sharedBrowser = this.browserManager.getBrowser();
      this.logger.info('Using shared browser instance for MCP servers');

      // Use static imports instead of dynamic imports
      const mcpModules = {
        browser: browserModule,
        filesystem: filesystemModule,
        commands: commandsModule,
      };

      // Create servers with appropriate configurations
      this.mcpServers = {
        browser: mcpModules.browser.createServer({
          externalBrowser: sharedBrowser,
          enableAdBlocker: false,
          launchOptions: {
            headless: this.tarsOptions.browser?.headless,
          },
        }),
        filesystem: mcpModules.filesystem.createServer({
          allowedDirectories: [this.workingDirectory],
        }),
        commands: mcpModules.commands.createServer(),
      };

      // Create in-memory clients for each server
      await Promise.all(
        Object.entries(this.mcpServers)
          .filter(([_, server]) => server !== null) // Skip null servers
          .map(async ([name, server]) => {
            const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

            // Create a client for this server
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

            // Connect the client and server
            await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

            // Store the client for later use
            this.inMemoryMCPClients[name as BuiltInMCPServerName] = client;
            // FIXME: check if global logger level is working.
            this.logger.info(`✅ Connected to ${name} MCP server`);
          }),
      );

      // If browser tools manager exists, set the browser client
      if (this.browserToolsManager && this.inMemoryMCPClients.browser) {
        this.browserToolsManager.setBrowserClient(this.inMemoryMCPClients.browser);
      }

      // Register browser tools using the strategy if available
      if (this.browserToolsManager) {
        const registeredTools = await this.browserToolsManager.registerTools((tool) =>
          this.registerTool(tool),
        );

        this.logger.info(
          `✅ Registered ${registeredTools.length} browser tools using '${this.tarsOptions.browser?.control || 'default'}' strategy`,
        );
      }

      // Always register non-browser tools regardless of browser tools manager
      await Promise.all(
        Object.entries(this.inMemoryMCPClients).map(async ([name, client]) => {
          if (name !== 'browser' || !this.browserToolsManager) {
            await this.registerToolsFromClient(name as BuiltInMCPServerName, client!);
          }
        }),
      );

      this.logger.info('✅ In-memory MCP initialization complete');
    } catch (error) {
      this.logger.error('❌ Failed to initialize in-memory MCP:', error);
      throw new Error(
        `Failed to initialize in-memory MCP: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register tools from a specific MCP client
   */
  private async registerToolsFromClient(
    moduleName: BuiltInMCPServerName,
    client: Client,
  ): Promise<void> {
    try {
      // Get tools from the client
      const tools = await client.listTools();

      if (!tools || !Array.isArray(tools.tools)) {
        this.logger.warn(`⚠️ No tools returned from '${moduleName}' module`);
        return;
      }

      // Register each tool with the agent
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

        this.registerTool(toolDefinition);
        this.logger.info(`Registered tool: ${toolDefinition.name}`);
      }

      this.logger.info(`Registered ${tools.tools.length} MCP tools from '${moduleName}'`);
    } catch (error) {
      this.logger.error(`❌ Failed to register tools from '${moduleName}' module:`, error);
      throw error;
    }
  }

  /**
   * Lazy browser initialization using on-demand pattern
   *
   * This hook intercepts tool calls and lazily initializes the browser only when
   * it's first needed by a browser-related tool.
   */
  override async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
  ) {
    if (toolCall.name.startsWith('browser')) {
      // Check if browser is already launching
      if (!this.browserManager.isLaunchingComplete()) {
        if (this.isReplaySnapshot) {
          // Skip actual browser launch in replay mode
        } else {
          await this.browserManager.launchBrowser({
            headless: this.tarsOptions.browser?.headless,
            cdpEndpoint: this.tarsOptions.browser?.cdpEndpoint,
          });
        }
      } else {
        // Check if browser is still alive, and recover if needed
        const isAlive = await this.browserManager.isBrowserAlive(true);

        if (!isAlive && !this.isReplaySnapshot) {
          // Browser is not alive and auto-recovery failed
          // Try one more explicit recovery attempt
          this.logger.warn('Browser appears to be terminated, attempting explicit recovery...');
          const recovered = await this.browserManager.recoverBrowser();

          if (!recovered) {
            this.logger.error('Browser recovery failed - tool call may not work correctly');
          }
        }
      }
    }

    /**
     * #815 `write_file` should respect workspace
     */
    if (toolCall.name === 'write_file') {
      if (
        typeof args === 'object' &&
        typeof args.path === 'string' &&
        !path.isAbsolute(args.path)
      ) {
        args.path = path.resolve(this.workingDirectory, args.path);
      }
    }

    /**
     * #817 `run_command` do not respect workspace
     */
    if (toolCall.name === 'run_command' || toolCall.name === 'run_script') {
      if (typeof args === 'object') {
        args.cwd = this.workingDirectory;
      }
    }

    return args;
  }

  /**
   * Override the onEachAgentLoopStart method to handle GUI Agent initialization
   * and planner lifecycle
   * This is called at the start of each agent iteration
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    // Initialize planner for new session
    // FIXME: we should not use `onEachAgentLoopStart` to update session's planner
    // A session would have multiple agent lopps

    // Update planner state for current iteration
    if (this.plannerManager) {
      this.plannerManager.onIterationStart(this.getCurrentLoopIteration());
    }

    // If GUI Agent is enabled and the browser is launched,
    // take a screenshot and send it to the event stream
    if (
      this.tarsOptions.browser?.control !== 'dom' &&
      this.browserGUIAgent &&
      this.browserManager.isLaunchingComplete()
    ) {
      // Ensure GUI Agent has access to the current event stream
      if (this.browserGUIAgent.setEventStream) {
        this.browserGUIAgent.setEventStream(this.eventStream);
      }

      await this.browserGUIAgent?.onEachAgentLoopStart(this.eventStream, this.isReplaySnapshot);
    }

    // Call any super implementation if it exists
    await super.onEachAgentLoopStart(sessionId);
  }

  override async onBeforeLoopTermination(
    id: string,
    finalEvent: AgentEventStream.AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> {
    return { finished: true };
  }

  override async onAgentLoopEnd(id: string): Promise<void> {
    await super.onAgentLoopEnd(id);
  }

  /**
   * Get information about the current browser control setup
   * @returns Object containing mode and registered tools
   */
  public getBrowserControlInfo(): { mode: string; tools: string[] } {
    if (this.browserToolsManager) {
      return {
        mode: this.browserToolsManager.getMode(),
        tools: this.browserToolsManager.getRegisteredTools(),
      };
    }

    return {
      mode: this.tarsOptions.browser?.control || 'default',
      tools: [],
    };
  }

  /**
   * Clean up resources when done
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up resources...');

    const cleanupPromises: Promise<void>[] = [];

    // Close each MCP client connection
    for (const [name, client] of Object.entries(this.inMemoryMCPClients)) {
      cleanupPromises.push(
        client.close().catch((error) => {
          this.logger.warn(`⚠️ Error while closing ${name} client: ${error}`);
        }),
      );
    }

    // Close each MCP server
    for (const [name, server] of Object.entries(this.mcpServers)) {
      if (server?.close) {
        cleanupPromises.push(
          server.close().catch((error) => {
            this.logger.warn(`⚠️ Error while closing ${name} server: ${error}`);
          }),
        );
      }
    }

    // Close the shared browser instance through the manager
    cleanupPromises.push(
      this.browserManager.closeBrowser().catch((error) => {
        this.logger.warn(`⚠️ Error while closing shared browser: ${error}`);
      }),
    );

    // Wait for all cleanup operations to complete
    await Promise.allSettled(cleanupPromises);

    // Clear references
    this.inMemoryMCPClients = {};
    this.mcpServers = {};
    this.browserGUIAgent = undefined;

    // Clear message history traces if dumper exists
    if (this.messageHistoryDumper) {
      this.messageHistoryDumper.clearTraces();
    }

    this.logger.info('✅ Cleanup complete');
  }

  /**
   * Get the current working directory for filesystem operations
   */
  public getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Get the logger instance used by this agent
   */
  public getLogger(): ConsoleLogger {
    return this.logger;
  }

  /**
   * Override onLLMRequest hook to capture requests for message history dump
   */
  override onLLMRequest(id: string, payload: LLMRequestHookPayload): void {
    // Add to message history if dumper is available
    if (this.messageHistoryDumper) {
      this.messageHistoryDumper.addRequestTrace(id, payload);
    }
  }

  /**
   * Override onLLMResponse hook to capture responses for message history dump
   */
  override onLLMResponse(id: string, payload: LLMResponseHookPayload): void {
    // Add to message history if dumper is available
    if (this.messageHistoryDumper) {
      this.messageHistoryDumper.addResponseTrace(id, payload);
    }
  }

  /**
   * Get the current abort signal if available
   * This allows other components to hook into the abort mechanism
   */
  public getAbortSignal(): AbortSignal | undefined {
    return this.executionController.getAbortSignal();
  }

  /**
   * Get the browser manager instance
   * This allows external components to access browser functionality
   */
  getBrowserManager(): BrowserManager | undefined {
    return this.browserManager;
  }

  /**
   * Override onAfterToolCall to update browser state after tool calls
   * This ensures we have the latest URL and screenshot after each browser operation
   */
  override async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
  ): Promise<any> {
    // Call super method first
    const processedResult = await super.onAfterToolCall(id, toolCall, result);

    // Update browser state if tool is browser-related and state manager exists
    if (
      toolCall.name === 'browser_navigate' &&
      this.browserManager.isLaunchingComplete() &&
      (await this.browserManager.isBrowserAlive())
    ) {
      if (this.tarsOptions.browser?.control === 'dom') {
        // console.time('browser_screenshot');
        const response = await this.inMemoryMCPClients['browser']?.callTool({
          name: 'browser_screenshot',
          arguments: {
            highlight: true,
          },
        });
        // console.timeEnd('browser_screenshot');
        if (Array.isArray(response?.content)) {
          const { data, type, mimeType } = response.content[1];
          if (type === 'image') {
            this.browserState.currentScreenshot = `data:${mimeType};base64,${data}`;
          }
        }
      } else if (this.browserGUIAgent) {
        const { compressedBase64 } = await this.browserGUIAgent.screenshot();
        this.browserState.currentScreenshot = compressedBase64;
      }
    }

    return processedResult;
  }

  override onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
    const { systemPrompt, tools } = context;

    if (this.plannerOptions?.enable && this.plannerManager) {
      // Filter tools based on planner state
      const toolFilterResult = this.plannerManager.filterTools(tools);
      return {
        tools: toolFilterResult.tools,
        systemPrompt: `${systemPrompt}\n\n ${toolFilterResult.systemPromptAddition}`,
      };
    }

    return {
      systemPrompt,
      tools,
    };
  }
}
