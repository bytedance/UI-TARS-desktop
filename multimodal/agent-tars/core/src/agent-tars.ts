/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Client,
  AgentEventStream,
  MCPAgent,
  MCPServerRegistry,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  ConsoleLogger,
  LoopTerminationCheckResult,
} from '@tarko/mcp-agent';
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
import { FilesystemToolsManager } from './filesystem';
import { applyDefaultOptions } from './shared/config-utils';
import { MessageHistoryDumper } from './shared/message-history-dumper';
import { WorkspacePathResolver } from './shared/workspace-path-resolver';
import { AgentWebUIImplementation } from '@agent-tars/interface';
import { AgentTARSLocalEnvironment, AgentTARSAIOEnvironment } from './initializers';
import { ToolLogger, ResourceCleaner } from './utils';

/**
 * AgentTARS - A multimodal AI agent with browser, filesystem, and search capabilities
 *
 * This class provides a comprehensive AI agent built on the Tarko framework,
 * offering seamless integration with browsers, file systems, and search providers.
 */
export class AgentTARS<T extends AgentTARSOptions = AgentTARSOptions> extends MCPAgent<T> {
  static label = '@agent-tars/core';

  /**
   * Default Web UI configuration for Agent TARS
   */
  static webuiConfig: AgentWebUIImplementation = {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
    title: 'Agent TARS',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'A multimodal AI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
    ],
    enableContextualSelector: true,
    guiAgent: {
      defaultScreenshotRenderStrategy: 'beforeAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
    },
    layout: {
      defaultLayout: 'narrow-chat',
      enableLayoutSwitchButton: true,
    },
  };

  // Core configuration
  private readonly workspace: string;
  private readonly tarsOptions: AgentTARSOptions;

  // Core utilities
  private readonly toolLogger: ToolLogger;
  private readonly resourceCleaner: ResourceCleaner;
  private readonly environment: AgentTARSLocalEnvironment | AgentTARSAIOEnvironment;

  // Legacy component references (for cleanup and public API)
  private inMemoryMCPClients: Partial<Record<BuiltInMCPServerName, Client>> = {};
  private mcpServers: BuiltInMCPServers = {};

  // State and utilities
  private browserState: BrowserState = {};
  private messageHistoryDumper?: MessageHistoryDumper;

  constructor(options: T) {
    // Apply defaults and validate configuration
    const processedOptions = applyDefaultOptions<AgentTARSOptions>(options);

    // Validate and adjust browser control mode
    if (processedOptions.browser?.control) {
      processedOptions.browser.control = validateBrowserControlMode(
        processedOptions.model?.provider,
        processedOptions.browser.control,
        new ConsoleLogger(options.id || 'AgentTARS'),
      );
    }

    const workspace = processedOptions.workspace ?? process.cwd();
    const instructions = AgentTARS.buildInstructions(
      processedOptions,
      workspace,
      options.instructions,
    );

    // Get MCP servers configuration based on mode
    const mcpServers = AgentTARS.buildMCPServerRegistry(processedOptions, workspace);

    // Initialize parent class first
    super({
      ...processedOptions,
      name: options.name ?? 'AgentTARS',
      instructions,
      mcpServers,
      maxTokens: processedOptions.maxTokens,
    });

    // Store configuration
    this.tarsOptions = processedOptions;
    this.workspace = workspace;

    // Initialize logger
    this.logger = this.logger.spawn('AgentTARS');
    this.logger.info(`🤖 AgentTARS initialized | Working directory: ${workspace}`);

    // Initialize core utilities
    this.toolLogger = new ToolLogger(this.logger);
    this.resourceCleaner = new ResourceCleaner(this.logger);
    
    // Create environment - it will manage all components internally
    this.environment = processedOptions.aioSandbox
      ? new AgentTARSAIOEnvironment(
          this.tarsOptions,
          this.workspace,
          this.logger,
        )
      : new AgentTARSLocalEnvironment(
          this.tarsOptions,
          this.workspace,
          this.logger,
        );

    // Initialize optional features
    this.initializeOptionalFeatures();
    this.setupEventHandlers();
  }

  /**
   * Initialize the agent and all its components
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing AgentTARS...');

    try {
      // Initialize all components through the environment
      const components = await this.environment.initialize(
        (tool) => this.registerTool(tool),
        this.eventStream,
      );

      // Store legacy references for cleanup
      this.inMemoryMCPClients = components.mcpClients;
      this.mcpServers = this.environment.getMCPServers();

      // Log registered tools
      this.toolLogger.logRegisteredTools(this.getTools());

      this.logger.info('✅ AgentTARS initialization complete');
    } catch (error) {
      this.logger.error('❌ Failed to initialize AgentTARS:', error);
      await this.cleanup();
      throw error;
    }

    await super.initialize();
  }

  /**
   * Handle tool call preprocessing - delegate to environment
   */
  override async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
  ): Promise<any> {
    return await this.environment.onBeforeToolCall(
      id,
      toolCall,
      args,
      this.isReplaySnapshot,
    );
  }

  /**
   * Handle agent loop start - delegate to environment
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    await this.environment.onEachAgentLoopStart(
      sessionId,
      this.eventStream,
      this.isReplaySnapshot,
    );

    await super.onEachAgentLoopStart(sessionId);
  }

  /**
   * Handle post-tool call processing - delegate to environment
   */
  override async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
  ): Promise<any> {
    const processedResult = await super.onAfterToolCall(id, toolCall, result);

    return await this.environment.onAfterToolCall(
      id,
      toolCall,
      processedResult,
      this.browserState,
    );
  }

  /**
   * Handle loop termination
   */
  override async onBeforeLoopTermination(
    id: string,
    finalEvent: AgentEventStream.AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> {
    return { finished: true };
  }

  /**
   * Handle session disposal - delegate to environment
   */
  override async onDispose(): Promise<void> {
    await this.environment.onDispose();
    await super.onDispose();
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    await this.resourceCleaner.cleanup(
      this.inMemoryMCPClients,
      this.mcpServers,
      this.browserManager,
      this.messageHistoryDumper,
    );

    // Clear references
    this.inMemoryMCPClients = {};
    this.mcpServers = {};
  }

  // Public API methods

  /**
   * Get browser control information
   */
  public getBrowserControlInfo(): { mode: string; tools: string[] } {
    return this.environment.getBrowserControlInfo();
  }

  /**
   * Get the current working directory
   */
  public getWorkingDirectory(): string {
    return this.workspace;
  }

  /**
   * Get the logger instance
   */
  public getLogger(): ConsoleLogger {
    return this.logger;
  }

  /**
   * Get the current abort signal
   */
  public getAbortSignal(): AbortSignal | undefined {
    return this.executionController.getAbortSignal();
  }

  /**
   * Get the browser manager instance
   */
  public getBrowserManager(): BrowserManager | undefined {
    return this.environment.getBrowserManager();
  }

  // Message history hooks for experimental features

  override onLLMRequest(id: string, payload: LLMRequestHookPayload): void {
    this.messageHistoryDumper?.addRequestTrace(id, payload);
  }

  override onLLMResponse(id: string, payload: LLMResponseHookPayload): void {
    this.messageHistoryDumper?.addResponseTrace(id, payload);
  }

  // Private helper methods

  /**
   * Build MCP server registry based on implementation type
   */
  private static buildMCPServerRegistry(
    options: AgentTARSOptions,
    workspace: string,
  ): MCPServerRegistry {
    // For AIO sandbox mode, connect to AIO sandbox MCP
    if (options.aioSandbox) {
      return {
        aio: {
          url: `${options.aioSandbox}/mcp`,
        },
        ...(options.mcpServers || {}),
      };
    }

    // For local mode with stdio implementation
    if (options.mcpImpl === 'stdio') {
      return {
        browser: {
          command: 'npx',
          args: ['-y', '@agent-infra/mcp-server-browser'],
        },
        filesystem: {
          command: 'npx',
          args: ['-y', '@agent-infra/mcp-server-filesystem', workspace],
        },
        commands: {
          command: 'npx',
          args: ['-y', '@agent-infra/mcp-server-commands'],
        },
        ...(options.mcpServers || {}),
      };
    }
    
    // For local mode with in-memory implementation or custom servers only
    return options.mcpServers || {};
  }

  /**
   * Build system instructions
   */
  private static buildInstructions(
    options: AgentTARSOptions,
    workspace: string,
    userInstructions?: string,
  ): string {
    const browserRules = generateBrowserRulesPrompt(options.browser?.control);
    const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n${browserRules}\n\n<environment>\nCurrent Working Directory: ${workspace}\n</environment>\n`;

    return userInstructions
      ? `${systemPrompt}\n\n---\n\n**User Instructions (Higher Priority):**\n\n${userInstructions}`
      : systemPrompt;
  }

  /**
   * Initialize optional features
   */
  private initializeOptionalFeatures(): void {
    // Initialize message history dumper if experimental feature is enabled
    if (this.tarsOptions.experimental?.dumpMessageHistory) {
      this.messageHistoryDumper = new MessageHistoryDumper({
        workspace: this.workspace,
        agentId: this.id,
        agentName: this.name,
        logger: this.logger,
      });
      this.logger.info('📝 Message history dump enabled');
    }
  }

  /**
   * Setup event stream handlers
   */
  private setupEventHandlers(): void {
    this.eventStream.subscribe((event) => {
      if (event.type === 'tool_result' && event.name === 'browser_navigate') {
        event._extra = this.browserState;
      }
    });
  }




}
