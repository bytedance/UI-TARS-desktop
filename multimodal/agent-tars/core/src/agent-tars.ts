/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentEventStream,
  MCPAgent,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  ConsoleLogger,
  LoopTerminationCheckResult,
} from '@tarko/mcp-agent';
import { AgentTARSOptions, BrowserState } from './types';
import { DEFAULT_SYSTEM_PROMPT, generateBrowserRulesPrompt } from './prompt';
import { BrowserManager } from './environments/local/browser';
import { validateBrowserControlMode } from './environments/local/browser/browser-control-validator';
import { applyDefaultOptions } from './shared/config-utils';
import { MessageHistoryDumper } from './shared/message-history-dumper';
import { AgentWebUIImplementation } from '@agent-tars/interface';
import { AgentTARSLocalEnvironment, AgentTARSAIOEnvironment } from './environments';
import { AgentTARSBaseEnvironment } from './environments/base';
import { ToolLogger } from './utils';

/**
 * AgentTARS - A multimodal AI agent with browser, filesystem, and search capabilities
 *
 * This class provides a comprehensive AI agent built on the Tarko framework,
 * offering seamless integration with browsers, file systems, and search providers.
 */
export class AgentTARS<T extends AgentTARSOptions = AgentTARSOptions> extends MCPAgent<T> {
  static label = '@agent-tars/core';

  /**
   * Default Agent UI Configuration for Agent TARS
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
    welcomeCards: [
      {
        title: 'Analyze Google Network Request',
        category: 'CodeAct',
        prompt: 'Use command to help me analyze the network request line of google.com',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/analyze-google-network-request-ea86c5.jpg',
      },
      {
        title: 'Use Remote Feat Agent Api Branch',
        category: 'CodeAct',
        prompt: '直接直接使用远程的  feat/agent-respnse-api 分支',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/featagent-respnse-api-3e7e29.jpg',
      },
      {
        title: 'Research on CLI Parameters of Claude Code and Gemini',
        category: 'Research',
        prompt:
          '帮我调研一下，claude code 和 gemini 使用 cli 直接运行，输入 prompt 的 cli 参数是什么？',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/claude-code-gemini-cli-d3fbf7.jpg',
      },
      {
        title: 'Query Website Filings On MIIT',
        category: 'AI Browser',
        prompt:
          '帮我打开 https://beian.miit.gov.cn/#/Integrated/recordQuery 查看以下网站的备案\r\n\r\n- https://www.bytedance.com\r\n- https://www.douyin.com\r\n- http://toutiao.com/\r\n\r\n整理成表格发给我，注意每次切换 website 要清空输入框',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/httpsbeianmiitgovcnintegratedrecordquery-httpswwwbytedancec-120388.jpg',
      },
      {
        title: "Draw Chart of Hangzhou's Weather",
        category: 'MCP',
        prompt: "Draw me a chart of Hangzhou's weather for one month",
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/draw-me-a-chart-34bc8d.jpg',
      },
      {
        title: 'How To Fix Git Process Error',
        category: 'CodeAct',
        prompt:
          "如何修复这个报错：Another git process seems to be running in this repository, e.g.\r\nan editor opened by 'git commit'. Please make sure all processes\r\nare terminated then try again. If it still fails, a git process\r\nmay have crashed in this repository earlier:\r\nremove the file manually to continue.\r\nerror: Unable to create '/Users/chenhaoli/workspace/code/UI-TARS-desktop/.git/logs/refs/remotes/origin/release/v0.2.0-beta.1.lock': File exists.",
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/another-git-process-seems-b6495e.jpg',
      },
      {
        title: 'In-depth Research on ByteDance Web Infra',
        category: 'Research',
        prompt:
          '帮我深度调研一下 ByteDance Web Infra，给出一份详细的调研报告\r\n\r\n我期待覆盖的信息： \r\n\r\n1. 团队介绍\r\n2. 主要的开源项目、贡献者；\r\n3. 应用场景； \r\n4. 项目活跃状态；\r\n5. 社区影响力；\r\n6. 技术蓝图；\r\n7. 你的思考；\r\n\r\n要求报告采用 Markdown 输出中文，最后写入文件，同时，并使用 HTML 绘制一个图文并茂的 Slide，介绍 ByteDance Web Infra',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/bytedance-web-infra-1-002133.jpg',
      },
      {
        title: 'Agent TARS Showcase UI Recreation',
        category: 'AI Coding',
        prompt: 'Write code to completely recreate this UI',
        image:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&crop=center',
      },
      {
        title: 'Design Neo - Brutalism Poster For Agent TARS',
        category: 'AI Coding',
        prompt:
          '设计一款符合 neo-brutalism 设计风格的海报\r\n\r\n- 主题：Agent TARS\r\n- 标语：开源多模态 AI Agent\r\n- 图标：https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png\r\n- 醒目的 CTA：https://agent-tars.com',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/neo-brutalism-poster-agent-bfa30c.jpg',
      },
      {
        title: 'Solve Problem Using Python Theory',
        category: 'CodeAct',
        prompt:
          'Try to solve this problem with theory combined with python command. You should notice that "I" and "H" node are not connected.',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/solve-problem-theory-python-020cc2.jpg',
      },
      {
        title: 'Book Flights On Priceline',
        category: 'AI Browser',
        prompt:
          "Please help me book the earliest flight from San Jose to New York on September 1st and the last return flight on September 6th on Priceline\r\n\r\nTip: After switching to Sort, you don't need to click Search anymore. Please answer me in English",
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/book-flights-san-jose-3c5d03.jpg',
      },
      {
        title: 'Open, Play And Pass Game',
        category: 'AI Browser',
        prompt:
          '1. Open this game: https://cpstest.click/en/aim-trainer#google_vignette\r\n2. Select total sec to 50\r\n3. Play and pass this game',
        image:
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/aim-trainer-50-seconds-e2416d.jpg',
      },
    ],
    enableContextualSelector: false,
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
  private readonly environment: AgentTARSBaseEnvironment;

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

    // Create environment first to get MCP configuration
    const environment = processedOptions.aioSandbox
      ? new AgentTARSAIOEnvironment(
          processedOptions,
          workspace,
          new ConsoleLogger(options.id || 'AgentTARS'),
        )
      : new AgentTARSLocalEnvironment(
          processedOptions,
          workspace,
          new ConsoleLogger(options.id || 'AgentTARS'),
        );

    // Initialize parent class with environment-provided MCP configuration
    super({
      ...processedOptions,
      name: options.name ?? 'AgentTARS',
      instructions,
      mcpServers: environment.getMCPServerRegistry(),
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

    // Use the environment created earlier (with updated logger)
    this.environment = environment;
    // Update environment logger to use the initialized logger
    if ('logger' in this.environment) {
      (this.environment as any).logger = this.logger.spawn(
        processedOptions.aioSandbox ? 'AIOEnvironment' : 'LocalEnvironment',
      );
    }

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
      await this.environment.initialize((tool) => this.registerTool(tool), this.eventStream);

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
    return await this.environment.onBeforeToolCall(id, toolCall, args, this.isReplaySnapshot);
  }

  /**
   * Handle agent loop start - delegate to environment
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    await this.environment.onEachAgentLoopStart(sessionId, this.eventStream, this.isReplaySnapshot);

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

    return await this.environment.onAfterToolCall(id, toolCall, processedResult, this.browserState);
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
    // Delegate cleanup to environment
    await this.environment.onDispose();
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
