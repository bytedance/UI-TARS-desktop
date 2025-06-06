/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, EventStream, Event, EventType } from '@multimodal/agent-interface';
import { AgioClient } from '../client';
import { AgioEventType } from '../types';
import os from 'os';

/**
 * Integration helper for Agent TARS
 */
export class AgentTarsIntegration {
  private agioClient: AgioClient;
  private eventUnsubscribe: (() => void) | null = null;
  private taskStartTime: Record<string, number> = {};
  private loopIterations: Record<string, number> = {};

  /**
   * Create a new Agent TARS integration
   *
   * @param agent The Agent TARS instance
   * @param agioClient The Agio client
   */
  constructor(
    private agent: AgentTARS,
    agioClient: AgioClient,
  ) {
    this.agioClient = agioClient;
  }

  /**
   * Initialize the integration with the Agent TARS instance
   *
   * @returns Function to clean up the integration
   */
  initialize(): () => void {
    // Send initialization event
    this.sendInitializationEvent();

    // Subscribe to the agent's event stream
    const eventStream = this.agent.getEventStream();
    this.eventUnsubscribe = this.subscribeToEvents(eventStream);

    // Return cleanup function
    return () => this.cleanup();
  }

  /**
   * Subscribe to Agent TARS events and map them to Agio events
   *
   * @param eventStream The Agent TARS event stream
   * @returns Unsubscribe function
   */
  private subscribeToEvents(eventStream: EventStream): () => void {
    return eventStream.subscribe((event: Event) => {
      this.handleAgentEvent(event);
    });
  }

  /**
   * Handle an Agent TARS event and map it to Agio events
   *
   * @param event The Agent TARS event
   */
  private handleAgentEvent(event: Event): void {
    const runId = event.id;

    switch (event.type) {
      case EventType.AGENT_RUN_START:
        this.taskStartTime[runId] = Date.now();
        this.loopIterations[runId] = 0;

        this.agioClient.send(AgioEventType.AGENT_RUN_START, {
          runId,
          query: typeof event.content === 'string' ? event.content : JSON.stringify(event.content),
          streaming: true, // Assuming streaming is enabled
        });
        break;

      case EventType.AGENT_RUN_END:
        const startTime = this.taskStartTime[runId] || event.timestamp;
        const executionTimeMs = Date.now() - startTime;

        this.agioClient.send(AgioEventType.AGENT_RUN_END, {
          runId,
          executionTimeMs,
          loopCount: this.loopIterations[runId] || 0,
          successful: event.status === 'success',
          tokenUsage: event.tokenUsage,
          error: event.error ? { message: event.error } : undefined,
        });

        // Clean up tracking
        delete this.taskStartTime[runId];
        delete this.loopIterations[runId];
        break;

      case EventType.ASSISTANT_STREAMING_MESSAGE:
        // First streaming message = TTFT
        if (event.isComplete === false && this.taskStartTime[runId]) {
          const ttftMs = Date.now() - this.taskStartTime[runId];
          this.agioClient.send(AgioEventType.AGENT_TTFT, {
            runId,
            ttftMs,
          });
        }
        break;

      case EventType.TOOL_CALL:
        this.agioClient.send(AgioEventType.TOOL_CALL, {
          runId,
          toolName: event.name,
          toolCallId: event.toolCallId,
          arguments: this.sanitizeArguments(event.arguments),
          isCustomTool: event.tool?.custom === true,
          mcpServer: event.tool?.mcpServer,
        });
        break;

      case EventType.TOOL_RESULT:
        this.agioClient.send(AgioEventType.TOOL_RESULT, {
          runId,
          toolName: event.name,
          toolCallId: event.toolCallId,
          executionTimeMs: event.elapsedMs || 0,
          successful: !event.error,
          resultSize: this.calculateResultSize(event.content),
          contentType: this.detectContentType(event.content),
        });
        break;
    }
  }

  /**
   * Send agent initialization event
   */
  private sendInitializationEvent(): void {
    const config = this.agent.getConfig();

    this.agioClient.send(AgioEventType.AGENT_INITIALIZED, {
      config: {
        modelProvider: config.model?.use?.provider,
        modelName: config.model?.use?.model,
        toolCallEngine: config.toolCallEngine,
        browserControl: config.browser?.control,
        plannerEnabled: !!config.planner?.enabled,
        thinkingEnabled: !!config.thinking,
        snapshotEnabled: false, // Would need to detect from agent
        researchEnabled: false, // Would need to detect from agent
        usingPreset: !!config.instructions, // Simple heuristic
        mcpServers: this.extractMcpServers(config),
      },
      system: {
        platform: os.platform(),
        osVersion: os.release(),
        nodeVersion: process.version,
      },
    });
  }

  /**
   * Extract MCP server names from config
   *
   * @param config Agent TARS config
   * @returns Array of MCP server names
   */
  private extractMcpServers(config: any): string[] | undefined {
    // This would depend on the actual structure of MCP configuration
    if (config.mcp?.servers) {
      return Object.keys(config.mcp.servers);
    }
    return undefined;
  }

  /**
   * Sanitize tool arguments to remove sensitive data
   *
   * @param args Tool arguments
   * @returns Sanitized arguments
   */
  private sanitizeArguments(
    args: Record<string, any> | undefined,
  ): Record<string, any> | undefined {
    if (!args) return undefined;

    const sanitized: Record<string, any> = {};

    // Copy arguments but sanitize sensitive fields
    for (const [key, value] of Object.entries(args)) {
      // Skip sensitive keys
      if (['password', 'token', 'secret', 'key', 'apiKey'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeArguments(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Estimate the size of a result in bytes
   *
   * @param content The result content
   * @returns Estimated size in bytes
   */
  private calculateResultSize(content: any): number | undefined {
    if (!content) return undefined;

    try {
      const json = JSON.stringify(content);
      return new TextEncoder().encode(json).length;
    } catch {
      // If can't stringify, return undefined
      return undefined;
    }
  }

  /**
   * Detect the content type of a result
   *
   * @param content The result content
   * @returns Content type string
   */
  private detectContentType(content: any): string | undefined {
    if (!content) return undefined;

    if (typeof content === 'string') {
      return 'text/plain';
    }

    if (Array.isArray(content)) {
      return 'application/json';
    }

    if (typeof content === 'object' && content !== null) {
      // Check for common multimedia content patterns
      if (content.type === 'image') {
        return content.mimeType || 'image/*';
      }

      if (content.type === 'text') {
        return 'text/plain';
      }

      return 'application/json';
    }

    return undefined;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.eventUnsubscribe) {
      this.eventUnsubscribe();
      this.eventUnsubscribe = null;
    }

    this.taskStartTime = {};
    this.loopIterations = {};
  }
}

/**
 * Create and initialize Agio integration with Agent TARS
 *
 * @param agent Agent TARS instance
 * @param agioClient Agio client
 * @returns Cleanup function
 */
export function setupAgentTarsIntegration(agent: AgentTARS, agioClient: AgioClient): () => void {
  const integration = new AgentTarsIntegration(agent, agioClient);
  return integration.initialize();
}
