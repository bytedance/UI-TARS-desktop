/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@multimodal/agio';
import {
  AgentTARSOptions,
  AgentTARS,
  AgentEventStream,
  AgentTARSAppConfig,
} from '@agent-tars/core';

/**
 * AgioProvider - Collects and sends AGIO monitoring events to configured providers
 *
 * This class implements the AGIO (Agent Insights and Observations) protocol
 * for server-side monitoring of agent operations. It transforms internal
 * agent events into standardized AGIO events and sends them to configured
 * monitoring endpoints.
 *
 * Key responsibilities:
 * - Convert Agent Event Stream events to AGIO monitoring events
 * - Handle event buffering and reliable delivery
 * - Manage provider communication and error handling
 * - Ensure privacy by sanitizing sensitive data
 */
export class AgioProvider {
  private runId?: string;
  private runStartTime?: number;
  private firstTokenTime?: number;
  private loopStartTimes: Map<number, number> = new Map();
  private currentIteration = 0;

  constructor(
    private providerUrl: string,
    private appConfig: AgentTARSAppConfig,
    private sessionId: string,
    private agent: AgentTARS,
  ) {
    this.sessionId = sessionId;
    this.agent = agent;
  }

  /**
   * Send agent initialization event
   * Called when an agent session is created
   */
  async sendAgentInitialized(): Promise<void> {
    const resolvedModel = this.agent.getCurrentResolvedModel();

    const event: AgioEvent.AgentInitializedEvent = {
      type: 'agent_initialized',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      config: {
        modelProvider: resolvedModel?.provider,
        modelName: resolvedModel?.id,
        toolCallEngine: this.appConfig.toolCallEngine,
        browserControl: this.appConfig.browser?.control,
        plannerEnabled:
          typeof this.appConfig.planner === 'object'
            ? this.appConfig.planner.enabled
            : Boolean(this.appConfig.planner),
        thinkingEnabled: this.appConfig.thinking?.type === 'enabled',
        snapshotEnabled: this.appConfig.snapshot?.enable,
        researchEnabled:
          typeof this.appConfig.planner === 'object'
            ? this.appConfig.planner.enabled
            : Boolean(this.appConfig.planner),
        customMcpServers: Boolean(
          this.appConfig.mcpServers && Object.keys(this.appConfig.mcpServers).length > 0,
        ),
      },
      system: {
        platform: process.platform,
        osVersion: process.version,
        nodeVersion: process.version,
      },
    };

    await this.sendEvent(event);
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
   * Handle agent run start events
   */
  private async handleRunStart(event: AgentEventStream.AgentRunStartEvent): Promise<void> {
    this.runId = event.sessionId;
    this.runStartTime = Date.now();
    this.firstTokenTime = undefined;
    this.currentIteration = 0;
    this.loopStartTimes.clear();

    const agioEvent: AgioEvent.AgentRunStartEvent = {
      type: 'agent_run_start',
      timestamp: event.timestamp,
      sessionId: this.sessionId,
      runId: this.runId,
      content: event.runOptions?.input || '',
      streaming: Boolean(event.runOptions?.stream),
    };

    await this.sendEvent(agioEvent);
  }

  /**
   * Handle agent run end events
   */
  private async handleRunEnd(event: AgentEventStream.AgentRunEndEvent): Promise<void> {
    if (!this.runStartTime || !this.runId) return;

    const executionTimeMs = Date.now() - this.runStartTime;

    const agioEvent: AgioEvent.AgentRunEndEvent = {
      type: 'agent_run_end',
      timestamp: event.timestamp,
      sessionId: this.sessionId,
      runId: this.runId,
      executionTimeMs,
      loopCount: event.iterations || this.currentIteration,
      successful: event.status !== 'error',
      error: event.status === 'error' ? { message: 'Agent execution failed' } : undefined,
    };

    await this.sendEvent(agioEvent);

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

      const agioEvent: AgioEvent.TTFTEvent = {
        type: 'agent_ttft',
        timestamp: event.timestamp,
        sessionId: this.sessionId,
        runId: this.runId,
        ttftMs,
      };

      await this.sendEvent(agioEvent);
    }
  }

  /**
   * Handle tool call events
   */
  private async handleToolCall(event: AgentEventStream.ToolCallEvent): Promise<void> {
    // Sanitize arguments to remove sensitive data
    const sanitizedArgs = this.sanitizeArguments(event.arguments);

    const agioEvent: AgioEvent.ToolCallEvent = {
      type: 'tool_call',
      timestamp: event.timestamp,
      sessionId: this.sessionId,
      runId: this.runId,
      toolName: event.name,
      toolCallId: event.toolCallId,
      arguments: sanitizedArgs,
      isCustomTool: !this.isBuiltInTool(event.name),
      mcpServer: this.extractMCPServer(event.name),
    };

    await this.sendEvent(agioEvent);
  }

  /**
   * Handle tool result events
   */
  private async handleToolResult(event: AgentEventStream.ToolResultEvent): Promise<void> {
    const agioEvent: AgioEvent.ToolResultEvent = {
      type: 'tool_result',
      timestamp: event.timestamp,
      sessionId: this.sessionId,
      runId: this.runId,
      toolName: event.name,
      toolCallId: event.toolCallId,
      executionTimeMs: event.elapsedMs || 0,
      successful: !event.error,
      resultSize: this.calculateResultSize(event.content),
      contentType: this.determineContentType(event.content),
    };

    await this.sendEvent(agioEvent);
  }

  /**
   * Handle loop start events
   */
  private async handleLoopStart(): Promise<void> {
    this.currentIteration++;
    this.loopStartTimes.set(this.currentIteration, Date.now());

    const agioEvent: AgioEvent.LoopStartEvent = {
      type: 'agent_loop_start',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      runId: this.runId,
      iteration: this.currentIteration,
    };

    await this.sendEvent(agioEvent);
  }

  /**
   * Handle loop end events
   */
  private async handleLoopEnd(event: AgentEventStream.AssistantMessageEvent): Promise<void> {
    const startTime = this.loopStartTimes.get(this.currentIteration);
    if (!startTime) return;

    const durationMs = Date.now() - startTime;

    const agioEvent: AgioEvent.LoopEndEvent = {
      type: 'agent_loop_end',
      timestamp: event.timestamp,
      sessionId: this.sessionId,
      runId: this.runId,
      iteration: this.currentIteration,
      durationMs,
    };

    await this.sendEvent(agioEvent);
    this.loopStartTimes.delete(this.currentIteration);
  }

  /**
   * Send an AGIO event to the configured provider
   */
  private async sendEvent(event: AgioEvent.Event): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(this.providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(event),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`AGIO event request to ${this.providerUrl} timed out`);
      } else {
        console.error(`Failed to send AGIO event to ${this.providerUrl}:`, error);
      }
      // Don't throw to avoid disrupting agent operation
    }
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
   * Check if a tool is a built-in tool
   */
  private isBuiltInTool(toolName: string): boolean {
    const builtInPrefixes = ['browser_', 'filesystem_', 'search_', 'commands_'];
    return builtInPrefixes.some((prefix) => toolName.startsWith(prefix));
  }

  /**
   * Extract MCP server name from tool name
   */
  private extractMCPServer(toolName: string): string | undefined {
    if (toolName.startsWith('browser_')) return 'browser';
    if (toolName.startsWith('filesystem_')) return 'filesystem';
    if (toolName.startsWith('search_')) return 'search';
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
}
