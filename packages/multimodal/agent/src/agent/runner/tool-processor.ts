/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent } from '../agent';
import { ToolManager } from '../tool-manager';
import {
  EventStream,
  EventType,
  ToolDefinition,
  ToolCallResult,
  JSONSchema7,
} from '@multimodal/agent-interface';
import { getLogger } from '../../utils/logger';
import { zodToJsonSchema } from '../../utils';

/**
 * ToolProcessor - Responsible for tool calls and processing
 *
 * This class handles the execution of tools, processing of tool results,
 * and managing tool-related state.
 */
export class ToolProcessor {
  private logger = getLogger('ToolProcessor');

  constructor(
    private agent: Agent,
    private toolManager: ToolManager,
    private eventStream: EventStream,
  ) {}

  /**
   * Get all available tools
   */
  getTools(): ToolDefinition[] {
    return this.toolManager.getTools();
  }

  /**
   * Process a collection of tool calls
   *
   * @param toolCalls Array of tool calls to execute
   * @param sessionId Session identifier
   * @param abortSignal Optional signal to abort the execution
   * @returns Array of tool call results
   */
  async processToolCalls(
    toolCalls: any[],
    sessionId: string,
    abortSignal?: AbortSignal,
  ): Promise<ToolCallResult[]> {
    // Collect results from all tool calls
    const toolCallResults: ToolCallResult[] = [];

    for (const toolCall of toolCalls) {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        this.logger.info(`[Tool] Tool call processing aborted`);
        break;
      }

      const toolName = toolCall.function.name;
      const toolCallId = toolCall.id;

      try {
        // Parse arguments
        let args = JSON.parse(toolCall.function.arguments || '{}');

        try {
          args = await this.agent.onBeforeToolCall(sessionId, { toolCallId, name: toolName }, args);
        } catch (hookError) {
          this.logger.error(`[Hook] Error in onBeforeToolCall: ${hookError}`);
        }

        // Create tool call event
        const toolCallEvent = this.eventStream.createEvent(EventType.TOOL_CALL, {
          toolCallId: toolCall.id,
          name: toolName,
          arguments: args,
          startTime: Date.now(),
          tool: {
            name: toolName,
            description: this.toolManager.getTool(toolName)?.description || 'Unknown tool',
            schema: this.getToolSchema(this.toolManager.getTool(toolName)),
          },
        });
        this.eventStream.sendEvent(toolCallEvent);

        // Check again for abort before executing the tool
        if (abortSignal?.aborted) {
          this.logger.info(`[Tool] Tool execution aborted before execution: ${toolName}`);

          // Create abort result event
          const abortResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
            toolCallId: toolCall.id,
            name: toolName,
            content: `Tool execution aborted`,
            elapsedMs: 0,
            error: 'aborted',
          });
          this.eventStream.sendEvent(abortResultEvent);

          toolCallResults.push({
            toolCallId: toolCall.id,
            toolName,
            content: `Tool execution aborted`,
          });

          continue;
        }

        // Execute the tool
        // eslint-disable-next-line prefer-const
        let { result, executionTime, error } = await this.toolManager.executeTool(
          toolName,
          toolCall.id,
          args,
        );

        if (!error) {
          try {
            result = await this.agent.onAfterToolCall(
              sessionId,
              { toolCallId, name: toolName },
              result,
            );
          } catch (hookError) {
            this.logger.error(`[Hook] Error in onAfterToolCall: ${hookError}`);
          }
        }

        // Create tool result event
        const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
          toolCallId: toolCall.id,
          name: toolName,
          content: result,
          elapsedMs: executionTime,
          error,
        });
        this.eventStream.sendEvent(toolResultEvent);

        // Add to results collection
        toolCallResults.push({
          toolCallId: toolCall.id,
          toolName,
          content: result,
        });
      } catch (error) {
        // Don't log aborted requests as errors
        if (abortSignal?.aborted) {
          this.logger.info(`[Tool] Tool execution aborted: ${toolName}`);
        } else {
          this.logger.error(`[Tool] Error processing tool call: ${toolName} | ${error}`);
        }

        let errorResult;
        try {
          errorResult = await this.agent.onToolCallError(
            sessionId,
            { toolCallId, name: toolName },
            error,
          );
        } catch (hookError) {
          this.logger.error(`[Hook] Error in onToolCallError: ${hookError}`);
          errorResult = `Error: ${error}`;
        }

        // Create error result event
        const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
          toolCallId: toolCall.id,
          name: toolName,
          content: `Error: ${error}`,
          elapsedMs: 0,
          error: String(error),
        });
        this.eventStream.sendEvent(toolResultEvent);

        toolCallResults.push({
          toolCallId: toolCall.id,
          toolName,
          content: `Error: ${error}`,
        });
      }
    }

    return toolCallResults;
  }

  /**
   * Get JSON schema for a tool
   * @param tool The tool definition
   * @returns JSON schema representation of the tool
   */
  private getToolSchema(tool?: ToolDefinition): JSONSchema7 {
    if (!tool) return { type: 'object', properties: {} };
    return tool.hasJsonSchema?.() ? (tool.schema as JSONSchema7) : zodToJsonSchema(tool.schema);
  }
}
