/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentRunObjectOptions,
  AgentRunStreamingOptions,
  AssistantMessageEvent,
  Event,
  EventStream,
  EventType,
  ToolCallEngine,
  ToolCallEngineType,
  AgentContextAwarenessOptions,
} from '@multimodal/agent-interface';
import { ToolManager } from './tool-manager';
import { ResolvedModel, LLMReasoningOptions } from '@multimodal/model-provider';
import { getLogger } from '../utils/logger';
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

/**
 * Runner configuration options
 */
interface AgentRunnerOptions {
  instructions: string;
  maxIterations: number;
  maxTokens?: number;
  temperature: number;
  reasoningOptions: LLMReasoningOptions;
  toolCallEngine?: ToolCallEngineType;
  eventStream: EventStream;
  toolManager: ToolManager;
  agent: Agent;
  contextAwarenessOptions?: AgentContextAwarenessOptions;
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
  private reasoningOptions: LLMReasoningOptions;
  private toolCallEngine?: ToolCallEngine; // lazy init
  private eventStream: EventStream;
  private toolManager: ToolManager;
  private agent: Agent;
  private contextAwarenessOptions?: AgentContextAwarenessOptions;
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
    this.reasoningOptions = options.reasoningOptions;
    this.eventStream = options.eventStream;
    this.toolManager = options.toolManager;
    this.agent = options.agent;
    this.contextAwarenessOptions = options.contextAwarenessOptions;

    // Initialize the specialized components
    this.toolProcessor = new ToolProcessor(this.agent, this.toolManager, this.eventStream);

    this.llmProcessor = new LLMProcessor(
      this.agent,
      this.eventStream,
      this.toolProcessor,
      this.reasoningOptions,
      this.maxTokens,
      this.temperature,
      this.contextAwarenessOptions,
    );

    this.loopExecutor = new LoopExecutor(
      this.agent,
      this.llmProcessor,
      this.eventStream,
      this.instructions,
      this.maxIterations,
    );

    this.streamAdapter = new StreamAdapter(this.eventStream);
  }

  /**
   * Create the appropriate tool call engine based on configuration
   * @param engineType The requested engine type
   * @returns The created tool call engine
   */
  private createToolCallEngine(engineType?: ToolCallEngineType): ToolCallEngine {
    let engine: ToolCallEngine;

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
   * Executes the agent's reasoning loop in non-streaming mode
   *
   * @param runOptions Options for this execution
   * @param sessionId Unique session identifier
   * @returns Final answer as an AssistantMessageEvent
   */
  async execute(
    runOptions: AgentRunObjectOptions,
    resolvedModel: ResolvedModel,
    sessionId: string,
  ): Promise<AssistantMessageEvent> {
    // Resolve which model and provider to use
    const abortSignal = runOptions.abortSignal;

    this.logger.info(
      `[Session] Execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.model}" | ` +
        `Mode: non-streaming`,
    );

    try {
      // Check if already aborted
      if (abortSignal?.aborted) {
        this.logger.warn(`[Session] Execution aborted before starting | SessionId: "${sessionId}"`);

        // Create system event for aborted execution
        const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
          level: 'warning',
          message: 'Execution aborted',
        });
        this.eventStream.sendEvent(systemEvent);

        // Return minimal response
        return this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
          content: 'Request was aborted',
          finishReason: 'abort',
        });
      }

      const toolCallEngineType =
        this.options.toolCallEngine ?? runOptions.toolCallEngine ?? 'native';
      const toolCallEngine = this.createToolCallEngine(toolCallEngineType);
      this.logger.info(`Using tool call engine: ${toolCallEngineType}`);

      // Execute the agent loop with abort signal
      return await this.loopExecutor.executeLoop(
        resolvedModel,
        sessionId,
        toolCallEngine,
        false, // Non-streaming mode
        abortSignal,
      );
    } finally {
      await this.agent.onAgentLoopEnd(sessionId);
    }
  }

  /**
   * Executes the agent's reasoning loop in streaming mode
   *
   * @param runOptions Options for this execution
   * @param sessionId Unique session identifier
   * @returns AsyncIterable of streaming events
   */
  async executeStreaming(
    runOptions: AgentRunStreamingOptions,
    resolvedModel: ResolvedModel,
    sessionId: string,
  ): Promise<AsyncIterable<Event>> {
    // Resolve which model and provider to use
    const abortSignal = runOptions.abortSignal;

    this.logger.info(
      `[Session] Execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.model}" | ` +
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
    this.logger.info(`Using tool call engine: ${toolCallEngineType}`);

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
        // Check if this was an abort
        if (abortSignal?.aborted) {
          this.logger.info(`[Stream] Agent loop execution aborted`);
          this.streamAdapter.abortStream();
        } else {
          // Handle other errors during execution
          this.logger.error(`[Stream] Error in agent loop execution: ${error}`);
        }

        // Rethrow if not an abort
        if (!abortSignal?.aborted) {
          throw error;
        }
      })
      .finally(async () => {
        await this.agent.onAgentLoopEnd(sessionId);
      });

    return stream;
  }
}
