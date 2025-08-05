/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@tarko/agio';
import { IAgent, AgentEventStream, AgentAppConfig, AgentStatus } from '@tarko/interface';
import { AgioBatchProcessor } from './AgioBatchProcessor';

/**
 * AgioProvider default implementation
 *
 * In fact, it is wrong to couple mcpServers here, but considering that it is not
 * worth doing too much abstraction for agio, we temporarily choose to keep the
 * implicit dependency to `mcp-agent` and `agent-tars`. so that the upper layers
 * of MCP Agent and Agent TARS do not need to implement AgioProvider.
 *
 * FIXME: we do not implement following events for now:
 *
 * - agent_tps
 * - user_feedback
 */
export class AgioProvider implements AgioEvent.AgioProvider {
  protected runId?: string;
  protected runStartTime?: number;
  protected firstTokenTime?: number;
  protected loopStartTimes: Map<number, number> = new Map();
  protected currentIteration = 0;
  protected hasInitialized = false;
  protected modelName?: string;
  private batchProcessor: AgioBatchProcessor;
  private agentInitializedEvent: AgioEvent.ExtendedEvent | null = null;

  constructor(
    protected providerUrl: string,
    protected appConfig: AgentAppConfig,
    protected sessionId: string,
    protected agent: IAgent,
  ) {
    this.sessionId = sessionId;
    this.agent = agent;
    // Since Options are transparent in the entire architecture and gradually shrink downward,
    // this method is the safest way to get Options with default values ​​processed by each layer.
    this.appConfig = agent.getOptions();

    // Initialize the batch processor for sending events efficiently.
    this.batchProcessor = new AgioBatchProcessor({
      providerUrl: this.providerUrl,
      maxBatchSize: 3,
    });
  }

  /**
   * Calculate actual counts from the agent instance
   */
  private calculateCounts(): {
    mcpServersCount: number;
    toolsCount: number;
    modelProvidersCount: number;
  } {
    // Get tools count from agent
    const toolsCount = this.agent.getTools().length;

    // Get model providers count from agent options
    const modelProviders = this.appConfig.model?.providers;
    const modelProvidersCount = Array.isArray(modelProviders) ? modelProviders.length : 1;

    // @ts-expect-error
    // Get MCP servers count from config
    const mcpServersConfig = this.appConfig.mcpServers || {};
    const mcpServersCount = Object.keys(mcpServersConfig).length;

    return {
      mcpServersCount,
      toolsCount,
      modelProvidersCount,
    };
  }

  /**
   * Send agent initialization event
   * Called when an agent session is created
   */
  async sendAgentInitialized(): Promise<void> {
    // Avoid duplicate initialization event
    if (this.hasInitialized) {
      return;
    }

    this.hasInitialized = true;

    const resolvedModel = this.agent.getCurrentResolvedModel();
    const counts = this.calculateCounts();

    this.modelName = resolvedModel?.id;

    const event = AgioEvent.createEvent('agent_initialized', this.sessionId, {
      config: {
        modelProvider: resolvedModel?.provider,
        modelName: resolvedModel?.id,
        toolCallEngine: this.appConfig.toolCallEngine,
        maxTokens: this.appConfig.maxTokens!,
        temperature: this.appConfig.temperature,
        maxIterations: this.appConfig.maxIterations,
        // @ts-expect-error
        browserControl: this.appConfig.browser?.control,
        plannerEnabled:
          // @ts-expect-error
          typeof this.appConfig.planner === 'object'
            ? // @ts-expect-error
              this.appConfig.planner.enable
            : // @ts-expect-error
              Boolean(this.appConfig.planner),
        thinkingEnabled: this.appConfig.thinking?.type === 'enabled',
        snapshotEnabled: this.appConfig.snapshot?.enable,
        researchEnabled:
          // @ts-expect-error
          typeof this.appConfig.planner === 'object'
            ? // @ts-expect-error
              this.appConfig.planner.enable
            : // @ts-expect-error
              Boolean(this.appConfig.planner),
        customMcpServers: Boolean(
          // @ts-expect-error
          this.appConfig.mcpServers && Object.keys(this.appConfig.mcpServers).length > 0,
        ),
      },

      count: counts,
    });

    this.agentInitializedEvent = event;
  }

  /**
   * Process internal agent events and convert to AGIO events
   * This is the main entry point for event processing
   */
  async processAgentEvent(event: AgentEventStream.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'agent_run_start':
          await this.handleRunStart(event);
          break;

        case 'agent_run_end':
          await this.handleRunEnd(event);
          break;

        case 'assistant_streaming_message':
          await this.handleFirstToken(event);
          break;

        case 'tool_call':
          await this.handleToolCall(event);
          break;

        case 'tool_result':
          await this.handleToolResult(event);
          break;

        case 'user_message':
          await this.handleLoopStart();
          break;

        case 'assistant_message':
          await this.handleLoopEnd(event);
          break;

        default:
          // Ignore other event types for AGIO monitoring
          break;
      }
    } catch (error) {
      console.error('Failed to process AGIO event:', error);
      // Don't throw to avoid disrupting agent operation
    }
  }

  /**
   * Helper method to determine if input is multimodal
   */
  private isInputMultimodal(input: string | any[]): boolean {
    // If input is not an array, it's just text
    if (!Array.isArray(input)) {
      return false;
    }

    // Check if any content part is non-text (image, etc.)
    return input.some((part) => {
      if (typeof part === 'object' && part !== null) {
        // Check for image_url type (multimodal content part)
        if (part.type === 'image_url' || part.type === 'image') {
          return true;
        }
        // Check for other non-text types that might be added in the future
        if (part.type && part.type !== 'text') {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Handle agent run start events
   */
  private async handleRunStart(event: AgentEventStream.AgentRunStartEvent): Promise<void> {
    // Send the deferred agent_initialized event if it exists
    if (this.agentInitializedEvent) {
      await this.queueEvent(this.agentInitializedEvent);
      // Clear the event to ensure it's only sent once per session
      this.agentInitializedEvent = null;
    }

    this.runId = event.sessionId;
    this.runStartTime = Date.now();
    this.firstTokenTime = undefined;
    this.currentIteration = 0;
    this.loopStartTimes.clear();

    // Determine if input is multimodal based on actual input content
    const isMultimodalInput = this.isInputMultimodal(event.runOptions?.input || '');

    const agioEvent = AgioEvent.createEvent('agent_run_start', this.sessionId, {
      runId: this.runId,
      input: event.runOptions?.input || '',
      isMultimodalInput,
      streaming: Boolean(event.runOptions?.stream),
    });

    await this.queueEvent(agioEvent);
  }

  /**
   * Handle agent run end events
   */
  private async handleRunEnd(event: AgentEventStream.AgentRunEndEvent): Promise<void> {
    if (!this.runStartTime || !this.runId) return;

    const executionTimeMs = Date.now() - this.runStartTime;

    const successful = event.status !== AgentStatus.ERROR;
    const isError = event.status === AgentStatus.ERROR;

    // FIXME: add token usage count
    const agioEvent = AgioEvent.createEvent('agent_run_end', this.sessionId, {
      runId: this.runId,
      executionTimeMs,
      loopCount: event.iterations || this.currentIteration,
      successful,
      // FIXME: catch all errors
      error: isError ? 'AgentRunError' : '',
    });

    await this.queueEvent(agioEvent);
    await this.batchProcessor.flush();

    // Reset run state
    this.runId = undefined;
    this.runStartTime = undefined;
  }

  /**
   * Handle first token detection for TTFT measurement
   */
  private async handleFirstToken(
    event: AgentEventStream.AssistantStreamingMessageEvent,
  ): Promise<void> {
    if (!this.firstTokenTime && this.runStartTime && event.content) {
      this.firstTokenTime = Date.now();
      const ttftMs = this.firstTokenTime - this.runStartTime;

      const agioEvent = AgioEvent.createEvent('agent_ttft', this.sessionId, {
        runId: this.runId,
        modelName: this.modelName,
        ttftMs,
      });

      await this.queueEvent(agioEvent);
    }
  }

  /**
   * Handle tool call events
   */
  private async handleToolCall(event: AgentEventStream.ToolCallEvent): Promise<void> {
    // Sanitize arguments to remove sensitive data
    const sanitizedArgs = this.sanitizeArguments(event.arguments);

    const agioEvent = AgioEvent.createEvent('tool_call', this.sessionId, {
      runId: this.runId,
      toolName: event.name,
      toolCallId: event.toolCallId,
      arguments: sanitizedArgs,
      argumentsSize: JSON.stringify(event.arguments).length,
      mcpServer: this.extractMCPServer(event.name),
    });

    await this.queueEvent(agioEvent);
  }

  /**
   * Handle tool result events
   */
  private async handleToolResult(event: AgentEventStream.ToolResultEvent): Promise<void> {
    const agioEvent = AgioEvent.createEvent('tool_result', this.sessionId, {
      runId: this.runId,
      toolName: event.name,
      toolCallId: event.toolCallId,
      executionTimeMs: event.elapsedMs || 0,
      successful: !event.error,
      resultSize: this.calculateResultSize(event.content),
      contentType: this.determineContentType(event.content),
    });

    await this.queueEvent(agioEvent);
  }

  /**
   * Handle loop start events
   */
  private async handleLoopStart(): Promise<void> {
    this.currentIteration++;
    this.loopStartTimes.set(this.currentIteration, Date.now());

    const agioEvent = AgioEvent.createEvent('agent_loop_start', this.sessionId, {
      runId: this.runId,
      iteration: this.currentIteration,
    });

    await this.queueEvent(agioEvent);
  }

  /**
   * Handle loop end events
   */
  private async handleLoopEnd(event: AgentEventStream.AssistantMessageEvent): Promise<void> {
    const startTime = this.loopStartTimes.get(this.currentIteration);
    if (!startTime) return;

    const durationMs = Date.now() - startTime;

    const agioEvent = AgioEvent.createEvent('agent_loop_end', this.sessionId, {
      runId: this.runId,
      iteration: this.currentIteration,
      durationMs,
    });

    await this.queueEvent(agioEvent);
    this.loopStartTimes.delete(this.currentIteration);
  }

  /**
   * Queues an AGIO event for batch sending.
   * The actual sending is handled by the AgioBatchProcessor.
   * @param event The AGIO event to queue.
   */
  protected queueEvent(event: AgioEvent.ExtendedEvent): void {
    this.batchProcessor.addEvent(event);
  }

  /**
   * Sanitize tool arguments to remove sensitive data
   */
  private sanitizeArguments(args: Record<string, any>): Record<string, any> {
    if (!args || typeof args !== 'object') {
      return {};
    }

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'apikey', 'auth'];

    for (const [key, value] of Object.entries(args)) {
      const keyLower = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => keyLower.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 100) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Extract MCP server name from tool name
   * FIXME: using a better solution to detect mcp server name.
   */
  private extractMCPServer(toolName: string): string | undefined {
    if (toolName.startsWith('browser_')) return 'browser';
    if (toolName.startsWith('filesystem_')) return 'filesystem';
    if (toolName === 'web_search') return 'search';
    if (toolName.startsWith('commands_')) return 'commands';
    return undefined;
  }

  /**
   * Calculate the size of tool result content
   */
  private calculateResultSize(content: any): number {
    if (!content) return 0;

    try {
      return JSON.stringify(content).length;
    } catch {
      return String(content).length;
    }
  }

  /**
   * Determine the content type of tool result
   */
  private determineContentType(content: any): string {
    if (!content) return 'empty';
    if (typeof content === 'string') return 'text';
    if (Array.isArray(content)) return 'array';
    if (typeof content === 'object') return 'object';
    return 'unknown';
  }

  /**
   * Flushes any buffered events to the provider.
   * This should be called during cleanup to ensure no events are lost.
   */
  public async cleanup(): Promise<void> {
    await this.batchProcessor.flush();
  }
}
