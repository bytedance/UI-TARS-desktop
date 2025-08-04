/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent } from '../agent';
import { ToolManager } from '../tool-manager';
import {
  AgentEventStream,
  Tool,
  ToolCallResult,
  JSONSchema7,
  ChatCompletionMessageToolCall,
} from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';
import { zodToJsonSchema } from '../../utils';

/**
 * ToolProcessor - Responsible for tool calls and processing
 *
 * This class handles the execution of tools, processing of tool results,
 * and managing tool-related state.
 */
export class ToolProcessor {
  private logger = getLogger('ToolProcessor');

  // Store all available tools for current execution context
  private currentExecutionTools: Tool[] = [];

  constructor(
    private agent: Agent,
    private toolManager: ToolManager,
    private eventStream: AgentEventStream.Processor,
  ) {}

  /**
   * Set tools for the current execution context
   * This replaces both dynamic and registered tools for this execution
   *
   * @param tools All tools available for this execution context
   */
  setExecutionTools(tools: Tool[]): void {
    this.currentExecutionTools = tools;
    this.logger.info(
      `Set ${tools.length} tools for current execution context: ${tools.map((t) => t.name).join(', ')}`,
    );
  }

  /**
   * Clear execution tools (called at the end of execution)
   */
  clearExecutionTools(): void {
    this.currentExecutionTools = [];
    this.logger.debug('Cleared execution tools');
  }

  /**
   * Get all available tools (fallback to registered tools if no execution tools set)
   */
  getTools(): Tool[] {
    return this.currentExecutionTools.length > 0
      ? this.currentExecutionTools
      : this.toolManager.getTools();
  }

  /**
   * Find a tool by name from current execution context
   *
   * @param name Tool name to find
   * @returns The tool definition or undefined if not found
   */
  private findTool(name: string): Tool | undefined {
    // Use execution tools if available, otherwise fallback to registered tools
    const toolsToSearch =
      this.currentExecutionTools.length > 0
        ? this.currentExecutionTools
        : this.toolManager.getTools();

    return toolsToSearch.find((tool) => tool.name === name);
  }

  /**
   * Execute a tool with the given arguments
   * Supports both dynamic and registered tools
   *
   * @param toolName Name of the tool to execute
   * @param toolCallId ID of the tool call
   * @param args Arguments to pass to the tool
   * @returns Result of execution and execution time
   */
  private async executeTool(
    toolName: string,
    toolCallId: string,
    args: unknown,
  ): Promise<{
    result: unknown;
    executionTime: number;
    error?: string;
  }> {
    const tool = this.findTool(toolName);

    if (!tool) {
      const errorMessage = `Tool "${toolName}" not found`;
      this.logger.error(`[Tool] Not found: "${toolName}"`);
      return {
        result: `Error: ${errorMessage}`,
        executionTime: 0,
        error: errorMessage,
      };
    }

    try {
      this.logger.info(`[Tool] Executing: "${toolName}" | ToolCallId: ${toolCallId}`);
      this.logger.debug(`[Tool] Arguments: ${JSON.stringify(args)}`);

      const startTime = Date.now();
      const result = await tool.function(args);
      const executionTime = Date.now() - startTime;

      this.logger.info(
        `[Tool] Execution completed: "${toolName}" | Duration: ${executionTime}ms | ToolCallId: ${toolCallId}`,
      );
      this.logger.debug(
        `[Tool] Result: ${typeof result === 'string' ? result : JSON.stringify(result)}`,
      );

      return {
        result,
        executionTime,
      };
    } catch (error) {
      const errorMessage = String(error);
      this.logger.error(
        `[Tool] Execution failed: "${toolName}" | Error: ${errorMessage} | ToolCallId: ${toolCallId}`,
      );

      return {
        result: `Error: ${errorMessage}`,
        executionTime: 0,
        error: errorMessage,
      };
    }
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
    toolCalls: ChatCompletionMessageToolCall[],
    sessionId: string,
    abortSignal?: AbortSignal,
  ): Promise<ToolCallResult[]> {
    // Check if operation was already aborted
    if (abortSignal?.aborted) {
      this.logger.info(`[Tool] Tool call processing aborted before starting`);
      return this.createAbortedToolCallResults(toolCalls);
    }

    // Allow agent to intercept and potentially replace tool call execution
    // This is essential for test mocking to avoid executing real tools
    try {
      const interceptedResults = await this.agent.onProcessToolCalls(sessionId, toolCalls);

      // If the hook returned results, use them instead of executing tools
      if (interceptedResults) {
        this.logger.info(
          `[Tool] Using intercepted tool call results for ${interceptedResults.length} tools`,
        );

        // Still create events for the intercepted results to maintain event stream consistency
        for (let i = 0; i < interceptedResults.length; i++) {
          const result = interceptedResults[i];
          const toolCall = toolCalls[i];
          const toolName = toolCall.function.name;
          const toolCallId = toolCall.id;

          // Parse arguments
          let args = JSON.parse(toolCall.function.arguments || '{}');

          // Trigger onBeforeToolCall hook
          try {
            args = await this.agent.onBeforeToolCall(
              sessionId,
              { toolCallId, name: toolName },
              args,
            );
          } catch (hookError) {
            this.logger.error(`[Hook] Error in onBeforeToolCall during interception: ${hookError}`);
          }

          // Create tool call event
          const toolCallEvent = this.eventStream.createEvent('tool_call', {
            toolCallId: toolCall.id,
            name: toolName,
            arguments: args,
            startTime: Date.now(),
            tool: {
              name: toolName,
              description: this.findTool(toolName)?.description || 'Unknown tool',
              schema: this.getToolSchema(this.findTool(toolName)),
            },
          });
          this.eventStream.sendEvent(toolCallEvent);

          // Trigger onAfterToolCall hook
          let content = result.content;
          try {
            content = await this.agent.onAfterToolCall(
              sessionId,
              { toolCallId, name: toolName },
              content,
            );
            // Update the result content with possibly modified content from the hook
            result.content = content;
          } catch (hookError) {
            this.logger.error(`[Hook] Error in onAfterToolCall during interception: ${hookError}`);
          }

          // Create tool result event
          const toolResultEvent = this.eventStream.createEvent('tool_result', {
            toolCallId: result.toolCallId,
            name: result.toolName,
            content: result.content,
            elapsedMs: 0, // For intercepted calls, we don't track execution time
            error: undefined,
          });
          this.eventStream.sendEvent(toolResultEvent);
        }

        return interceptedResults;
      }
    } catch (error) {
      this.logger.error(`[Tool] Error in onProcessToolCalls hook: ${error}`);
      // Continue with normal execution if hook fails
    }

    // If no interception, proceed with normal tool execution
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
        const toolCallEvent = this.eventStream.createEvent('tool_call', {
          toolCallId: toolCall.id,
          name: toolName,
          arguments: args,
          startTime: Date.now(),
          tool: {
            name: toolName,
            description: this.findTool(toolName)?.description || 'Unknown tool',
            schema: this.getToolSchema(this.findTool(toolName)),
          },
        });
        this.eventStream.sendEvent(toolCallEvent);

        // Check again for abort before executing the tool
        if (abortSignal?.aborted) {
          this.logger.info(`[Tool] Tool execution aborted before execution: ${toolName}`);

          // Create abort result event
          const abortResultEvent = this.eventStream.createEvent('tool_result', {
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

        // Execute the tool using the unified execution method
        // eslint-disable-next-line prefer-const
        let { result, executionTime, error } = await this.executeTool(toolName, toolCall.id, args);

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
        const toolResultEvent = this.eventStream.createEvent('tool_result', {
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
        const toolResultEvent = this.eventStream.createEvent('tool_result', {
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
   * Create aborted tool call results for all tool calls
   * Helper method to handle the abort case
   */
  private createAbortedToolCallResults(
    toolCalls: ChatCompletionMessageToolCall[],
  ): ToolCallResult[] {
    return toolCalls.map((toolCall) => ({
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      content: `Tool execution aborted`,
    }));
  }

  /**
   * Get JSON schema for a tool
   * @param tool The tool definition
   * @returns JSON schema representation of the tool
   */
  private getToolSchema(tool?: Tool): JSONSchema7 {
    if (!tool) return { type: 'object', properties: {} };
    return tool.hasJsonSchema?.() ? (tool.schema as JSONSchema7) : zodToJsonSchema(tool.schema);
  }
}
