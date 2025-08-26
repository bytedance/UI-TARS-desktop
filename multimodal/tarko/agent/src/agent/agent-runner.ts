/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentRunObjectOptions,
  AgentRunStreamingOptions,
  AgentEventStream,
  ToolCallEngine,
  ToolCallEngineType,
  AgentContextAwarenessOptions,
  TConstructor,
} from '@tarko/agent-interface';
import { ToolManager } from './tool-manager';
import { ResolvedModel, LLMReasoningOptions } from '@tarko/model-provider';
import { getLogger } from '@tarko/shared-utils';
import type { Agent } from './agent';
import {
  NativeToolCallEngine,
  PromptEngineeringToolCallEngine,
  StructuredOutputsToolCallEngine,
} from '../tool-call-engine';
import { LLMProcessor } from './runner/llm-processor';
import { ToolProcessor } from './runner/tool-processor';
import { LoopExecutor } from './runner/loop-executor';
import { StreamAdapter } from './runner/stream-adapter';
import { AgentEventStreamProcessor } from './event-stream';

/**
 * Runner configuration options
 */
interface AgentRunnerOptions {
  instructions: string;
  maxIterations: number;
  maxTokens?: number;
  temperature: number;
  top_p?: number;
  reasoningOptions: LLMReasoningOptions;
  toolCallEngine?: ToolCallEngineType;
  eventStream: AgentEventStreamProcessor;
  toolManager: ToolManager;
  agent: Agent;
  contextAwarenessOptions?: AgentContextAwarenessOptions;
  enableStreamingToolCallEvents: boolean;
  enableMetrics: boolean;
}

/**
 * AgentRunner - Coordinates the agent's execution
 *
 * This class serves as the main entry point for running agent loops,
 * delegating to specialized components for specific functionality.
 */
export class AgentRunner {
  private instructions: string;
  private maxIterations: number;
  private maxTokens?: number;
  private temperature: number;
  private top_p?: number;
  private reasoningOptions: LLMReasoningOptions;
  private toolCallEngine?: ToolCallEngine; // lazy init
  private eventStream: AgentEventStreamProcessor;
  private toolManager: ToolManager;
  private agent: Agent;
  private contextAwarenessOptions?: AgentContextAwarenessOptions;
  private enableStreamingToolCallEvents: boolean;
  private enableMetrics: boolean;
  private logger = getLogger('AgentRunner');

  // Specialized components
  public readonly toolProcessor: ToolProcessor;
  public readonly llmProcessor: LLMProcessor;
  public readonly loopExecutor: LoopExecutor;
  public readonly streamAdapter: StreamAdapter;

  constructor(private options: AgentRunnerOptions) {
    this.instructions = options.instructions;
    this.maxIterations = options.maxIterations;
    this.maxTokens = options.maxTokens;
    this.temperature = options.temperature;
    this.top_p = options.top_p;
    this.reasoningOptions = options.reasoningOptions;
    this.eventStream = options.eventStream;
    this.toolManager = options.toolManager;
    this.agent = options.agent;
    this.contextAwarenessOptions = options.contextAwarenessOptions;
    this.enableStreamingToolCallEvents = options.enableStreamingToolCallEvents;
    this.enableMetrics = options.enableMetrics;

    // Initialize the specialized components
    this.toolProcessor = new ToolProcessor(this.agent, this.toolManager, this.eventStream);

    this.llmProcessor = new LLMProcessor(
      this.agent,
      this.eventStream,
      this.toolProcessor,
      this.reasoningOptions,
      this.maxTokens,
      this.temperature,
      this.top_p,
      this.contextAwarenessOptions,
      this.enableStreamingToolCallEvents,
      this.enableMetrics,
    );

    this.loopExecutor = new LoopExecutor(
      this.agent,
      this.llmProcessor,
      this.toolProcessor,
      this.eventStream,
      this.instructions,
      this.maxIterations,
    );

    this.streamAdapter = new StreamAdapter(this.eventStream);
  }

  /**
   * Create the appropriate tool call engine based on configuration
   * @param engineType The requested engine type (string or constructor)
   * @returns The created tool call engine
   */
  private createToolCallEngine(engineType?: ToolCallEngineType): ToolCallEngine {
    let engine: ToolCallEngine;

    // Check if engineType is a constructor function
    if (typeof engineType === 'function') {
      try {
        engine = new engineType();
        this.logger.info(`Created custom tool call engine: ${engineType.name}`);
        return engine;
      } catch (error) {
        this.logger.error(`Failed to create custom tool call engine: ${error}`);
        // Fallback to native engine on error
        engineType = 'native';
      }
    }

    // Handle string-based engine types
    switch (engineType) {
      case 'prompt_engineering':
        engine = new PromptEngineeringToolCallEngine();
        break;
      case 'native':
        engine = new NativeToolCallEngine();
        break;
      case 'structured_outputs':
        engine = new StructuredOutputsToolCallEngine();
        break;
      default:
        // Default to native engine
        engineType = 'native';
        engine = new NativeToolCallEngine();
        break;
    }

    return engine;
  }

  /**
   * Get the current loop iteration number
   * @returns The current iteration number (1-based)
   */
  getCurrentIteration(): number {
    return this.loopExecutor.getCurrentIteration();
  }

  /**
   * Handles errors from LLM processing and agent loop execution
   * @param error The error that occurred
   * @param resolvedModel The resolved model information
   * @param sessionId The current session ID
   * @param abortSignal Optional abort signal
   * @returns An assistant message event with error information
   */
  private handleError(
    error: unknown,
    resolvedModel: ResolvedModel,
    sessionId: string,
    abortSignal?: AbortSignal,
  ): AgentEventStream.AssistantMessageEvent {
    // Check if this is an abort error
    const isAbortError =
      (error instanceof Error && error.name === 'AbortError') || abortSignal?.aborted;

    if (isAbortError) {
      this.logger.info(`[Session] Execution aborted | SessionId: "${sessionId}"`);

      // Add system event for aborted request
      const systemEvent = this.eventStream.createEvent('system', {
        level: 'info',
        message: `LLM request aborted`,
        details: { provider: resolvedModel.provider },
      });
      this.eventStream.sendEvent(systemEvent);

      // Return an abort message
      return this.eventStream.createEvent('assistant_message', {
        content: 'Request was aborted',
        finishReason: 'abort',
        ttltMs: 0, // Immediate abort, no processing time
      });
    } else {
      // Handle other types of errors
      this.logger.error(
        `[Session] Error in execution | SessionId: "${sessionId}" | Error: ${error}`,
      );

      // Add system event for error
      const systemEvent = this.eventStream.createEvent('system', {
        level: 'error',
        message: `LLM API error: ${error}`,
        details: { error: String(error), provider: resolvedModel.provider },
      });
      this.eventStream.sendEvent(systemEvent);

      // Add error message as assistant response
      const errorMessage = `Sorry, an error occurred while processing your request: ${error}`;
      return this.eventStream.createEvent('assistant_message', {
        content: errorMessage,
        finishReason: 'error',
      });
    }
  }

  /**
   * Executes the agent's reasoning loop in non-streaming mode
   *
   * @param runOptions Options for this execution
   * @param resolvedModel The resolved model configuration
   * @param sessionId Unique session identifier
   * @returns Final answer as an AgentEventStream.AssistantMessageEvent
   */
  async execute(
    runOptions: AgentRunObjectOptions,
    resolvedModel: ResolvedModel,
    sessionId: string,
  ): Promise<AgentEventStream.AssistantMessageEvent> {
    // Resolve which model and provider to use
    const abortSignal = runOptions.abortSignal;

    this.logger.info(
      `[Session] Execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.id}" | ` +
        `Mode: non-streaming`,
    );

    try {
      // Check if already aborted
      if (abortSignal?.aborted) {
        this.logger.warn(`[Session] Execution aborted before starting | SessionId: "${sessionId}"`);

        // Return minimal response
        return this.eventStream.createEvent('assistant_message', {
          content: 'Request was aborted',
          finishReason: 'abort',
        });
      }

      const toolCallEngineType =
        this.options.toolCallEngine ?? runOptions.toolCallEngine ?? 'native';
      const toolCallEngine = this.createToolCallEngine(toolCallEngineType);

      // Log the engine type info
      const engineInfo =
        typeof toolCallEngineType === 'function'
          ? `custom constructor (${toolCallEngineType.name})`
          : toolCallEngineType;
      this.logger.info(`Using tool call engine: ${engineInfo}`);

      try {
        // Execute the agent loop with abort signal
        return await this.loopExecutor.executeLoop(
          resolvedModel,
          sessionId,
          toolCallEngine,
          false, // Non-streaming mode
          abortSignal,
        );
      } catch (error) {
        // Handle LLM and execution errors
        return this.handleError(error, resolvedModel, sessionId, abortSignal);
      }
    } finally {
      await this.agent.onAgentLoopEnd(sessionId);
    }
  }

  /**
   * Executes the agent's reasoning loop in streaming mode
   *
   * @param runOptions Options for this execution
   * @param resolvedModel The resolved model configuration
   * @param sessionId Unique session identifier
   * @returns AsyncIterable of streaming events
   */
  async executeStreaming(
    runOptions: AgentRunStreamingOptions,
    resolvedModel: ResolvedModel,
    sessionId: string,
  ): Promise<AsyncIterable<AgentEventStream.Event>> {
    // Resolve which model and provider to use
    const abortSignal = runOptions.abortSignal;

    this.logger.info(
      `[Session] Execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.id}" | ` +
        `Mode: streaming`,
    );

    // Check if already aborted
    if (abortSignal?.aborted) {
      this.logger.warn(`[Session] Execution aborted before starting | SessionId: "${sessionId}"`);

      // Create an empty stream with just an abort event
      const emptyStream = this.streamAdapter.createAbortedStream();
      return emptyStream;
    }

    const toolCallEngineType = this.options.toolCallEngine ?? runOptions.toolCallEngine ?? 'native';
    const toolCallEngine = this.createToolCallEngine(toolCallEngineType);

    // Log the engine type info
    const engineInfo =
      typeof toolCallEngineType === 'function'
        ? `custom constructor (${toolCallEngineType.name})`
        : toolCallEngineType;
    this.logger.info(`Using tool call engine: ${engineInfo}`);

    // Create a stream of events
    const stream = this.streamAdapter.createStreamFromEvents(abortSignal);

    // Start the agent loop execution in the background
    this.loopExecutor
      .executeLoop(
        resolvedModel,
        sessionId,
        toolCallEngine,
        true, // Streaming mode
        abortSignal,
      )
      .then((finalEvent) => {
        // When the loop is completely done (final answer produced)
        this.logger.info(`[Stream] Agent loop execution completed with final answer`);
        this.streamAdapter.completeStream(finalEvent);
        return finalEvent;
      })
      .catch((error) => {
        // Handle errors in execution
        if (abortSignal?.aborted) {
          this.logger.info(`[Stream] Agent loop execution aborted`);
          this.streamAdapter.abortStream();
        } else {
          // Handle other errors during execution
          this.logger.error(`[Stream] Error in agent loop execution: ${error}`);

          // Create system error event
          const systemEvent = this.eventStream.createEvent('system', {
            level: 'error',
            message: `Error in agent execution: ${error}`,
            details: { error: String(error), provider: resolvedModel.provider },
          });
          this.eventStream.sendEvent(systemEvent);
        }
      })
      .finally(async () => {
        await this.agent.onAgentLoopEnd(sessionId);
      });

    return stream;
  }
}
