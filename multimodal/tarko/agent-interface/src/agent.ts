/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AgentOptions } from './agent-options';
import {
  AgentStatus,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  SummaryRequest,
  SummaryResponse,
  LoopTerminationCheckResult,
  PrepareRequestContext,
  PrepareRequestResult,
  EachAgentLoopEndContext,
} from './agent-instance';
import { AgentRunObjectOptions, AgentRunStreamingOptions } from './agent-run-options';
import {
  ChatCompletionMessageToolCall,
  OpenAI,
  ChatCompletionCreateParams,
  ChatCompletion,
  RequestOptions,
  ChatCompletionChunk,
} from '@tarko/model-provider/types';
import { ToolCallResult } from './tool-call-engine';
import { ResolvedModel } from '@tarko/model-provider';
import { AgentEventStream } from './agent-event-stream';
import { Tool } from './tool';

/**
 * Core Agent interface defining the essential methods and behaviors
 * that all agent implementations must support.
 */
export interface IAgent<T extends AgentOptions = AgentOptions> {
  /**
   * Initialize the agent, performing any required setup
   * This may be time-consuming operations that need to be completed before the agent can run
   */
  initialize(): void | Promise<void>;

  /**
   * Run the agent with the provided input
   *
   * @param input - String input for a basic text message
   * @returns The final response event from the agent
   */
  run(input: string): Promise<AgentEventStream.AssistantMessageEvent>;

  /**
   * Run the agent with additional configuration options
   *
   * @param options - Object with input and optional configuration
   * @returns The final response event from the agent
   */
  run(
    options: AgentRunObjectOptions & { stream?: false },
  ): Promise<AgentEventStream.AssistantMessageEvent>;

  /**
   * Run the agent in streaming mode
   *
   * @param options - Object with input and streaming enabled
   * @returns An async iterable of streaming events
   */
  run(options: AgentRunStreamingOptions): Promise<AsyncIterable<AgentEventStream.Event>>;

  /**
   * Abort the currently running agent task
   *
   * @returns True if an execution was aborted, false otherwise
   */
  abort(): boolean;

  /**
   * Get the current execution status of the agent
   *
   * @returns The current agent status
   */
  status(): AgentStatus;

  /**
   * Dispose of the agent and release all resources
   *
   * This method should be called when the agent is no longer needed.
   * It will:
   * - Stop any running tasks
   * - Clean up event listeners and subscriptions
   * - Release system resources
   * - Reset internal state
   *
   * After calling dispose(), the agent should not be used anymore.
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Get the event stream associated with this agent
   *
   * @returns The event stream instance
   */
  getEventStream(): AgentEventStream.Processor;

  /**
   * Returns all registered tools as an array
   *
   * @returns Array of all registered tool definitions
   */
  getTools(): Tool[];

  /**
   * Get the configured LLM client for making direct requests
   *
   * @returns The configured OpenAI-compatible LLM client instance or undefined if not available
   */
  getLLMClient(): OpenAI | undefined;

  /**
   * Generate a summary of conversation messages
   *
   * FIXME: remove it, high-level layout can use resolved model to implement it.
   *
   * @param request The summary request containing messages and optional model settings
   * @returns Promise resolving to the summary response
   */
  generateSummary(request: SummaryRequest): Promise<SummaryResponse>;

  /**
   * Get the current resolved model configuration
   *
   * @returns The current resolved model configuration or undefined if not set
   */
  getCurrentResolvedModel(): ResolvedModel | undefined;

  /**
   * Hook called before sending a request to the LLM
   *
   * @param id Session identifier for this conversation
   * @param payload The complete request payload
   */
  onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void>;

  /**
   * Hook called after receiving a response from the LLM
   *
   * @param id Session identifier for this conversation
   * @param payload The complete response payload
   */
  onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void>;

  /**
   * Hook called after receiving streaming responses from the LLM
   *
   * @param id Session identifier for this conversation
   * @param payload The streaming response payload
   */
  onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void;

  /**
   * Hook called before a tool is executed
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool being called
   * @param args The arguments for the tool call
   * @returns The possibly modified args for the tool call
   */
  onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
  ): Promise<any> | any;

  /**
   * Hook called after a tool is executed
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool that was called
   * @param result The result of the tool call
   * @returns The possibly modified result of the tool call
   */
  onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
  ): Promise<any> | any;

  /**
   * Hook called when a tool execution results in an error
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool that was called
   * @param error The error that occurred
   * @returns A potentially modified error or recovery value
   */
  onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: any,
  ): Promise<any> | any;

  /**
   * Hook called at the beginning of each agent loop iteration
   *
   * @param sessionId The session identifier for this conversation
   * @returns A promise that resolves when pre-iteration setup is complete
   */
  onEachAgentLoopStart(sessionId: string): void | Promise<void>;

  /**
   * Hook called at the end of each agent loop iteration
   *
   * This method is invoked after each iteration of the agent loop completes,
   * allowing derived classes to perform cleanup, logging, or state updates
   * based on the iteration results.
   *
   * @param context The iteration end context including session info and results
   * @returns A promise that resolves when post-iteration cleanup is complete
   */
  onEachAgentLoopEnd(context: EachAgentLoopEndContext): void | Promise<void>;

  /**
   * Hook called at the end of the agent's execution loop
   *
   * @param id Session identifier for the completed conversation
   */
  onAgentLoopEnd(id: string): void | Promise<void>;

  /**
   * Hook called before processing a batch of tool calls
   *
   * @param id Session identifier for this conversation
   * @param toolCalls Array of tool calls to be processed
   * @returns Either undefined (to execute tools normally) or an array of tool call results (to skip execution)
   */
  onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined;

  /**
   * Hook called when the agent loop is about to terminate with a final answer
   *
   * @param id Session identifier for this conversation
   * @param finalEvent The final assistant message event that would end the loop
   * @returns Decision object indicating whether to finish or continue the loop
   */
  onBeforeLoopTermination(
    id: string,
    finalEvent: AgentEventStream.AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> | LoopTerminationCheckResult;

  /**
   * Request to terminate the agent loop after the current iteration
   *
   * @returns True if the termination request was set, false if already terminating
   */
  requestLoopTermination(): boolean;

  /**
   * Check if loop termination has been requested
   *
   * @returns True if termination has been requested
   */
  isLoopTerminationRequested(): boolean;

  /**
   * Get the current iteration/loop number of the agent's reasoning process
   *
   * @returns The current loop iteration (1-based, 0 if not running)
   */
  getCurrentLoopIteration(): number;

  /**
   * Get the agent's configuration options
   *
   * @returns The agent configuration options used during initialization
   */
  getOptions(): T;

  /**
   * Convenient method to call the current selected LLM with chat completion api.
   *
   * @param params - ChatCompletion parameters (without model, supports stream parameter for type inference)
   * @param options - Optional request options (e.g., signal for abort)
   * @returns Promise resolving to ChatCompletion for non-streaming, or AsyncIterable<ChatCompletionChunk> for streaming
   */
  callLLM(
    params: Omit<ChatCompletionCreateParams, 'model'> & { stream?: false },
    options?: RequestOptions,
  ): Promise<ChatCompletion>;

  callLLM(
    params: Omit<ChatCompletionCreateParams, 'model'> & { stream: true },
    options?: RequestOptions,
  ): Promise<AsyncIterable<ChatCompletionChunk>>;

  callLLM(
    params: Omit<ChatCompletionCreateParams, 'model'>,
    options?: RequestOptions,
  ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>>;

  /**
   * Hook called before preparing the LLM request
   *
   * @param context The request preparation context including current prompt, tools, and state
   * @returns The modified system prompt and tools to use for this request
   */
  onPrepareRequest(
    context: PrepareRequestContext,
  ): Promise<PrepareRequestResult> | PrepareRequestResult;
}