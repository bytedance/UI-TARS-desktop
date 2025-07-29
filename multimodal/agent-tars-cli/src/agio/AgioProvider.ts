/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@multimodal/agio';
import { IAgent, AgentEventStream, AgentTARSAppConfig } from '@agent-tars/interface';
import { AgentStatus } from '@agent-tars/core';

/**
 * AgioProvider implementation for Agent TARS
 */
export class AgioProvider implements AgioEvent.AgioProvider {
  protected runId?: string;
  protected runStartTime?: number;
  protected firstTokenTime?: number;
  protected loopStartTimes: Map<number, number> = new Map();
  protected currentIteration = 0;
  protected hasInitialized = false;
  protected modelName?: string;

  constructor(
    protected providerUrl: string,
    protected appConfig: AgentTARSAppConfig,
    protected sessionId: string,
    protected agent: IAgent,
  ) {
    this.appConfig = agent.getOptions() as AgentTARSAppConfig;
  }

  async sendAgentInitialized(): Promise<void> {
    if (this.hasInitialized) return;
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
        browserControl: this.appConfig.browser?.control,
        plannerEnabled: Boolean(this.appConfig.planner),
        thinkingEnabled: this.appConfig.thinking?.type === 'enabled',
        snapshotEnabled: this.appConfig.snapshot?.enable,
        researchEnabled: Boolean(this.appConfig.planner),
        customMcpServers: Boolean(
          this.appConfig.mcpServers && Object.keys(this.appConfig.mcpServers).length > 0,
        ),
      },
      count: counts,
    });

    await this.sendEvent(event);
  }

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
      }
    } catch (error) {
      console.error('Failed to process AGIO event:', error);
    }
  }

  private calculateCounts(): {
    mcpServersCount: number;
    toolsCount: number;
    modelProvidersCount: number;
  } {
    const toolsCount = this.agent.getTools().length;
    const modelProviders = this.appConfig.model?.providers;
    const modelProvidersCount = Array.isArray(modelProviders) ? modelProviders.length : 1;
    const mcpServersConfig = this.appConfig.mcpServers || {};
    const mcpServersCount = Object.keys(mcpServersConfig).length;

    return { mcpServersCount, toolsCount, modelProvidersCount };
  }

  private async handleRunStart(event: AgentEventStream.AgentRunStartEvent): Promise<void> {
    this.runId = event.sessionId;
    this.runStartTime = Date.now();
    this.firstTokenTime = undefined;
    this.currentIteration = 0;
    this.loopStartTimes.clear();

    const isMultimodalInput = this.isInputMultimodal(event.runOptions?.input || '');

    const agioEvent = AgioEvent.createEvent('agent_run_start', this.sessionId, {
      runId: this.runId,
      input: event.runOptions?.input || '',
      isMultimodalInput,
      streaming: Boolean(event.runOptions?.stream),
    });

    await this.sendEvent(agioEvent);
  }

  private async handleRunEnd(event: AgentEventStream.AgentRunEndEvent): Promise<void> {
    if (!this.runStartTime || !this.runId) return;

    const executionTimeMs = Date.now() - this.runStartTime;
    const successful = event.status !== AgentStatus.ERROR;
    const isError = event.status === AgentStatus.ERROR;

    const agioEvent = AgioEvent.createEvent('agent_run_end', this.sessionId, {
      runId: this.runId,
      executionTimeMs,
      loopCount: event.iterations || this.currentIteration,
      successful,
      error: isError ? 'AgentRunError' : '',
    });

    await this.sendEvent(agioEvent);
    this.runId = undefined;
    this.runStartTime = undefined;
  }

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

      await this.sendEvent(agioEvent);
    }
  }

  private async handleToolCall(event: AgentEventStream.ToolCallEvent): Promise<void> {
    const sanitizedArgs = this.sanitizeArguments(event.arguments);

    const agioEvent = AgioEvent.createEvent('tool_call', this.sessionId, {
      runId: this.runId,
      toolName: event.name,
      toolCallId: event.toolCallId,
      arguments: sanitizedArgs,
      argumentsSize: JSON.stringify(event.arguments).length,
      mcpServer: this.extractMCPServer(event.name),
    });

    await this.sendEvent(agioEvent);
  }

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

    await this.sendEvent(agioEvent);
  }

  private async handleLoopStart(): Promise<void> {
    this.currentIteration++;
    this.loopStartTimes.set(this.currentIteration, Date.now());

    const agioEvent = AgioEvent.createEvent('agent_loop_start', this.sessionId, {
      runId: this.runId,
      iteration: this.currentIteration,
    });

    await this.sendEvent(agioEvent);
  }

  private async handleLoopEnd(event: AgentEventStream.AssistantMessageEvent): Promise<void> {
    const startTime = this.loopStartTimes.get(this.currentIteration);
    if (!startTime) return;

    const durationMs = Date.now() - startTime;

    const agioEvent = AgioEvent.createEvent('agent_loop_end', this.sessionId, {
      runId: this.runId,
      iteration: this.currentIteration,
      durationMs,
    });

    await this.sendEvent(agioEvent);
    this.loopStartTimes.delete(this.currentIteration);
  }

  private isInputMultimodal(input: string | any[]): boolean {
    if (!Array.isArray(input)) return false;
    return input.some((part) => typeof part === 'object' && part?.type === 'image_url');
  }

  private sanitizeArguments(args: Record<string, any>): Record<string, any> {
    if (!args || typeof args !== 'object') return {};

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

  private extractMCPServer(toolName: string): string | undefined {
    if (toolName.startsWith('browser_')) return 'browser';
    if (toolName.startsWith('filesystem_')) return 'filesystem';
    if (toolName === 'web_search') return 'search';
    if (toolName.startsWith('commands_')) return 'commands';
    return undefined;
  }

  private calculateResultSize(content: any): number {
    if (!content) return 0;
    try {
      return JSON.stringify(content).length;
    } catch {
      return String(content).length;
    }
  }

  private determineContentType(content: any): string {
    if (!content) return 'empty';
    if (typeof content === 'string') return 'text';
    if (Array.isArray(content)) return 'array';
    if (typeof content === 'object') return 'object';
    return 'unknown';
  }

  private async sendEvent(event: AgioEvent.ExtendedEvent): Promise<void> {
    try {
      await fetch(this.providerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [event] }),
      });
    } catch (error) {
      // Silently ignore errors
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for this simple implementation
  }
}
