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
import { PlanManager, DEFAULT_PLANNING_PROMPT } from './planner/plan-manager';
import { SearchToolProvider } from './search';
import { applyDefaultOptions } from './shared/config-utils';

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
  private planManager?: PlanManager;
  private currentIteration = 0;
  private browserToolsManager?: BrowserToolsManager;
  private searchToolProvider?: SearchToolProvider;
  private browserState: BrowserState = {};

  // FIXME: remove it from core.
  // Message history storage for experimental dump feature
  private traces: Array<{
    type: 'request' | 'response';
    timestamp: number;
    id: string;
    data: any;
  }> = [];

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

    // Generate planner prompt if enabled
    let plannerPrompt = '';
    if (plannerOptions?.enable) {
      plannerPrompt = `${DEFAULT_PLANNING_PROMPT} \n\n ${plannerOptions.planningPrompt ?? ''}`;
    }

    // Generate browser rules based on control solution
    const browserRules = generateBrowserRulesPrompt(tarsOptions.browser?.control);

    const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}
${plannerPrompt ? `\n${plannerPrompt}` : ''}
${browserRules}

<environment>
Current Working Directory: ${workingDirectory}
</environment>

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
    this.workingDirectory = workingDirectory;
    this.logger.info(`🤖 AgentTARS initialized | Working directory: ${workingDirectory}`);

    // Initialize browser manager instead of direct browser instance
    this.browserManager = BrowserManager.getInstance(this.logger);
    this.browserManager.lastLaunchOptions = {
      headless: this.tarsOptions.browser?.headless,
      cdpEndpoint: this.tarsOptions.browser?.cdpEndpoint,
    };
    if (plannerOptions?.enable) {
      this.planManager = new PlanManager(this.logger, this.eventStream, this, plannerOptions);
    }

    if (options.experimental?.dumpMessageHistory) {
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

      // Always create browser tools manager regardless of control mode
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

      // Register planner tools if enabled
      if (this.planManager) {
        const plannerTools = this.planManager.getTools();
        plannerTools.forEach((tool) => this.registerTool(tool));
        this.logger.info(`Registered ${plannerTools.length} planner tools`);
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

    return args;
  }

  /**
   * Override the onEachAgentLoopStart method to handle GUI Agent initialization
   * and planner lifecycle
   * This is called at the start of each agent iteration
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    this.currentIteration++;

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

    // Handle planner lifecycle if enabled
    if (this.planManager && !this.isReplaySnapshot) {
      const llmClient = this.getLLMClient();
      const resolvedModel = this.getCurrentResolvedModel();

      if (llmClient && resolvedModel) {
        // Get messages for planning context
        const messages = this.getMessagesForPlanning();

        if (this.currentIteration === 1) {
          // Generate initial plan on first iteration
          await this.planManager.generateInitialPlan(llmClient, resolvedModel, messages, sessionId);
        } else {
          // Update plan on subsequent iterations
          await this.planManager.updatePlan(llmClient, resolvedModel, messages, sessionId);
        }
      }
    }

    // Call any super implementation if it exists
    await super.onEachAgentLoopStart(sessionId);
  }

  /**
   * Override onBeforeLoopTermination to ensure "final_answer" is called if planner is enabled
   */
  override async onBeforeLoopTermination(
    id: string,
    finalEvent: AgentEventStream.AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> {
    // If planner is enabled, check if "final_answer" was called
    // if (
    //   this.planManager &&
    //   !this.planManager.isfinalAnswerCalled() &&
    //   this.planManager.hasPlanGenerated()
    // ) {
    //   this.logger.warn(`[Planner] Preventing loop termination: "final_answer" tool was not called`);

    //   // Add a user message reminding the agent to call "final_answer"
    //   const reminderEvent = this.eventStream.createEvent('user_message', {
    //     content:
    //       'Please call the "final_answer" tool before providing your final answer. This is required to complete the task.',
    //   });
    //   this.eventStream.sendEvent(reminderEvent);

    //   // Prevent loop termination
    //   return {
    //     finished: false,
    //     message: '"final_answer" tool must be called before completing the task',
    //   };
    // }

    // If planner is not enabled, no plan was generated, or "final_answer" was called, allow termination
    return { finished: true };
  }

  /**
   * Override onAgentLoopEnd to reset planner state
   */
  override async onAgentLoopEnd(id: string): Promise<void> {
    if (this.planManager) {
      this.planManager.resetFinalAnswerStatus();
      this.currentIteration = 0;
    }

    // Close all browser pages but keep the browser instance alive for next task
    // try {
    //   if (this.browserManager.isLaunchingComplete()) {
    //     this.logger.info('Closing all browser pages after task completion');
    //     await this.browserManager.closeAllPages();
    //   }
    // } catch (error) {
    //   this.logger.warn(
    //     `Failed to close browser pages: ${error instanceof Error ? error.message : String(error)}`,
    //   );
    // }

    await super.onAgentLoopEnd(id);
  }

  /**
   * Get messages from event stream formatted for planning purposes
   *
   * FIXME: better memory control
   */
  private getMessagesForPlanning(): any[] {
    // Get user and assistant messages
    const events = this.eventStream.getEventsByType(['user_message', 'assistant_message']);

    // Convert events to message format
    return events.map((event) => {
      if (event.type === 'assistant_message') {
        return {
          role: 'assistant',
          content: event.content,
        };
      } else {
        return {
          role: 'user',
          content:
            // @ts-expect-error FIXME: handle type error
            typeof event?.content === 'string' ? event.content : JSON.stringify(event.content),
        };
      }
    });
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
    // Add to message history if feature is enabled
    if (this.tarsOptions.experimental?.dumpMessageHistory) {
      this.traces.push({
        type: 'request',
        timestamp: Date.now(),
        id,
        // FIXME: redesign the trace impl, using JSONL.
        data: JSON.parse(JSON.stringify(payload)),
      });

      // Dump the message history after each request
      this.dumpMessageHistory(id);
    }
  }

  /**
   * Override onLLMResponse hook to capture responses for message history dump
   */
  override onLLMResponse(id: string, payload: LLMResponseHookPayload): void {
    // Add to message history if feature is enabled
    if (this.tarsOptions.experimental?.dumpMessageHistory) {
      this.traces.push({
        type: 'response',
        timestamp: Date.now(),
        id,
        // FIXME: redesign the trace impl, using JSONL.
        data: JSON.parse(JSON.stringify(payload)),
      });

      // Dump the message history after each response
      this.dumpMessageHistory(id);
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
   * Save message history to file
   * This is an experimental feature that dumps all LLM requests and responses
   * to a JSON file in the working directory.
   *
   * The file will be named using the session ID to ensure all communications
   * within the same session are stored in a single file.
   *
   * @param sessionId The session ID to use for the filename
   */
  private dumpMessageHistory(sessionId: string): void {
    try {
      if (!this.tarsOptions.experimental?.dumpMessageHistory) {
        return;
      }

      // Use sessionId for the filename to ensure we update the same file
      // throughout the session
      const filename = `session_${sessionId}.json`;
      const filePath = path.join(this.workingDirectory, filename);

      // Create a formatted JSON object with metadata
      const output = {
        agent: {
          id: this.id,
          name: this.name,
        },
        sessionId,
        timestamp: Date.now(),
        history: this.traces,
      };

      // Pretty-print the JSON for better readability
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
      this.logger.debug(`📝 Message history updated in: ${filePath}`);
    } catch (error) {
      this.logger.error('Failed to dump message history:', error);
    }
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
}
