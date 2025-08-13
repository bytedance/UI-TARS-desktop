/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentOptions,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ToolCallResult,
  ChatCompletionMessageToolCall,
  AgentEventStream,
  LoopTerminationCheckResult,
  Tool,
  PrepareRequestContext,
  PrepareRequestResult,
  EachAgentLoopEndContext,
} from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';

/**
 * BaseAgent - Handles all Agent lifecycle-related methods
 *
 * This class provides a foundation for agent implementations by managing:
 * - Lifecycle hooks (onLLMRequest, onLLMResponse, etc.)
 * - Tool call hooks (onBeforeToolCall, onAfterToolCall, etc.)
 * - Loop management hooks (onEachAgentLoopStart, onAgentLoopEnd, etc.)
 * - Termination control (requestLoopTermination, onBeforeLoopTermination)
 *
 * Derived classes can override these methods to implement custom behavior
 * without needing to implement the complete agent functionality.
 */
export abstract class BaseAgent<T extends AgentOptions = AgentOptions> {
  protected logger = getLogger('BaseAgent');
  private shouldTerminateLoop = false;
  private isDisposed = false;

  constructor(protected options: T) {}

  /**
   * Control the initialize process, you may need to perform some time-consuming
   * operations before starting here
   */
  public initialize(): void | Promise<void> {
    // Default implementation does nothing
    // Derived classes can override to add initialization logic
  }

  /**
   * Dispose of the agent and release all resources
   *
   * This method provides a base implementation that:
   * - Marks the agent as disposed
   * - Resets internal state
   * - Calls the disposal hook for derived classes
   *
   * Derived classes should override onDispose() to add specific cleanup logic.
   *
   * @returns A promise that resolves when disposal is complete
   */
  public async dispose(): Promise<void> {
    if (this.isDisposed) {
      this.logger.debug('Agent already disposed, ignoring dispose call');
      return;
    }

    this.logger.info('Disposing agent and releasing resources');

    try {
      // Call the disposal hook for derived classes
      await this.onDispose();

      // Reset internal state
      this.shouldTerminateLoop = false;
      this.isDisposed = true;

      this.logger.info('Agent disposal completed successfully');
    } catch (error) {
      this.logger.error(`Error during agent disposal: ${error}`);
      throw error;
    }
  }

  /**
   * Check if the agent has been disposed
   *
   * @returns True if the agent has been disposed
   */
  protected isAgentDisposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Hook called during agent disposal
   *
   * Derived classes can override this method to perform custom cleanup:
   * - Close connections
   * - Clear timers
   * - Release custom resources
   * - Clean up event listeners
   *
   * @returns A promise that resolves when custom disposal is complete
   */
  protected onDispose(): Promise<void> | void {
    // Default implementation does nothing
    // Derived classes can override to add disposal logic
  }

  /**
   * Hook called before sending a request to the LLM
   * This allows subclasses to inspect the request before it's sent
   *
   * @param id Session identifier for this conversation
   * @param payload The complete request payload
   */
  public onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    // Default implementation: pass-through
  }

  /**
   * Hook called after receiving a response from the LLM
   * This allows subclasses to inspect the response before it's processed
   *
   * @param id Session identifier for this conversation
   * @param payload The complete response payload
   */
  public onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    // Default implementation: pass-through, perf cost: 0.007ms - 0.021ms
  }

  /**
   * Hook called after receiving streaming responses from the LLM
   * Similar to onLLMResponse, but specifically for streaming
   *
   * @param id Session identifier for this conversation
   * @param payload The streaming response payload
   */
  public onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    // Keep it empty.
  }

  /**
   * Hook called at the beginning of each agent loop iteration
   * This method is invoked before each iteration of the agent loop starts,
   * allowing derived classes to perform setup or inject additional context
   *
   * @param sessionId The session identifier for this conversation
   * @returns A promise that resolves when pre-iteration setup is complete
   */
  public onEachAgentLoopStart(sessionId: string): void | Promise<void> {
    // Default implementation does nothing
    // Derived classes can override to insert custom logic
  }

  /**
   * Hook called at the end of each agent loop iteration
   * This method is invoked after each iteration of the agent loop completes,
   * allowing derived classes to perform cleanup, logging, or state updates
   * based on the iteration results
   *
   * @param context The iteration end context including session info and results
   * @returns A promise that resolves when post-iteration cleanup is complete
   */
  public onEachAgentLoopEnd(context: EachAgentLoopEndContext): void | Promise<void> {
    // Default implementation does nothing
    // Derived classes can override to insert custom logic
  }

  /**
   * Hook called before a tool is executed
   * This allows subclasses to intercept or modify tool calls before execution
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool being called
   * @param args The arguments for the tool call
   * @returns The possibly modified args for the tool call
   */
  public onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
  ): Promise<any> | any {
    this.logger.infoWithData(`[Tool] onBeforeToolCall`, { toolCall }, JSON.stringify);
    // Default implementation: pass-through
    return args;
  }

  /**
   * Hook called after a tool is executed
   * This allows subclasses to intercept or modify tool results after execution
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool that was called
   * @param result The result of the tool call
   * @returns The possibly modified result of the tool call
   */
  public onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
  ): Promise<any> | any {
    this.logger.infoWithData(`[Tool] onAfterToolCall`, { toolCall, result }, JSON.stringify);
    // Default implementation: pass-through
    return result;
  }

  /**
   * Hook called when a tool execution results in an error
   * This allows subclasses to handle or transform errors from tool calls
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool that was called
   * @param error The error that occurred
   * @returns A potentially modified error or recovery value
   */
  public onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: any,
  ): Promise<any> | any {
    this.logger.infoWithData(`[Tool] onToolCallError`, { toolCall, error }, JSON.stringify);
    // Default implementation: pass through the error
    return `Error: ${error}`;
  }

  /**
   * Hook called at the end of the agent's execution loop
   * This method is invoked after the agent has completed all iterations or reached a final answer
   *
   * @param id Session identifier for the completed conversation
   */
  public onAgentLoopEnd(id: string): void | Promise<void> {
    // Reset termination flag
    this.shouldTerminateLoop = false;
  }

  /**
   * Hook called before processing a batch of tool calls
   * This allows for intercepting and potentially replacing tool call execution
   * without executing the actual tools - essential for test mocking
   *
   * @param id Session identifier for this conversation
   * @param toolCalls Array of tool calls to be processed
   * @returns Either undefined (to execute tools normally) or an array of tool call results (to skip execution)
   */
  public onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined {
    // Default implementation allows normal tool execution
    return undefined;
  }

  /**
   * Hook called when the agent loop is about to terminate with a final answer
   * This allows subclasses to inspect the final response and decide whether to:
   * 1. Allow termination (return {finished: true})
   * 2. Force continuation (return {finished: false})
   *
   * This hook is crucial for higher-level agents that need to enforce specific
   * completion criteria or ensure certain tools are called before finishing.
   *
   * @param id Session identifier for this conversation
   * @param finalEvent The final assistant message event that would end the loop
   * @returns Decision object indicating whether to finish or continue the loop
   */
  public onBeforeLoopTermination(
    id: string,
    finalEvent: AgentEventStream.AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> | LoopTerminationCheckResult {
    // Default implementation always allows termination
    return { finished: true };
  }

  /**
   * Request to terminate the agent loop after the current iteration
   * This allows higher-level agents to control when the loop should end,
   * even if there are remaining iterations or tool calls
   *
   * @returns True if the termination request was set, false if already terminating
   */
  public requestLoopTermination(): boolean {
    if (this.shouldTerminateLoop) {
      return false;
    }

    this.logger.info(`[Agent] Loop termination requested by higher-level agent`);
    this.shouldTerminateLoop = true;
    return true;
  }

  /**
   * Check if loop termination has been requested
   * Used internally by the loop executor
   *
   * @returns True if termination has been requested
   * @internal
   */
  public isLoopTerminationRequested(): boolean {
    return this.shouldTerminateLoop;
  }

  /**
   * Reset the termination flag when a new run begins
   * @internal
   */
  protected resetLoopTermination(): void {
    this.shouldTerminateLoop = false;
  }

  /**
   * Get the agent's configuration options
   *
   * @returns The agent configuration options used during initialization
   */
  public getOptions(): T {
    return this.options;
  }

  /**
   * Hook called before preparing the LLM request
   * This allows subclasses to dynamically modify both the system prompt and available tools
   * based on the current conversation state, iteration, or any other context.
   *
   * This hook replaces the need for separate tool filtering and system prompt modification,
   * providing a unified way to customize the agent's behavior dynamically.
   *
   * @param context The request preparation context including current prompt, tools, and state
   * @returns The modified system prompt and tools to use for this request
   */
  public onPrepareRequest(
    context: PrepareRequestContext,
  ): Promise<PrepareRequestResult> | PrepareRequestResult {
    // Default implementation: no modifications
    return {
      systemPrompt: context.systemPrompt,
      tools: context.tools,
    };
  }

  /**
   * Hook called when retrieving tools for the agent
   * This allows subclasses to filter, modify or enhance the available tools
   *
   * @deprecated Use `onPrepareRequest` instead for more comprehensive request preparation
   *
   * IMPORTANT: This hook should not rely heavily on agent's internal state
   * that changes during execution, as it could lead to inconsistent behavior
   * between getAvailableTools() calls made before run() and the actual
   * tools used during run().
   *
   * @param tools The list of registered tools
   * @returns The filtered or modified list of tools
   */
  public onRetrieveTools(tools: Tool[]): Promise<Tool[]> | Tool[] {
    // Default implementation: return all tools without modification
    return tools;
  }
}