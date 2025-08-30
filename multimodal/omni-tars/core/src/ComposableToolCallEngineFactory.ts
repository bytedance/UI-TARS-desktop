/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ToolCallEngine, ToolCallEnginePrepareRequestContext } from '@tarko/agent';
import {
  TConstructor,
  ChatCompletionCreateParams,
  ChatCompletionChunk,
  StreamProcessingState,
  StreamChunkResult,
  ParsedModelResponse,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  MultimodalToolCallResult,
  AgentEventStream,
} from '@tarko/agent-interface';
import { ComposableToolCallEngine } from './ComposableToolCallEngine';
import { ToolCallEngineCompositionConfig } from './types';

/**
 * Factory class that wraps ComposableToolCallEngine to conform to the expected interface
 */
export class ComposableToolCallEngineFactory extends ToolCallEngine {
  private composableEngine: ComposableToolCallEngine;

  constructor(config: ToolCallEngineCompositionConfig) {
    super();
    this.composableEngine = new ComposableToolCallEngine(config);
  }

  preparePrompt(instructions: string, tools: Tool[]) {
    return this.composableEngine.preparePrompt(instructions, tools);
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return this.composableEngine.prepareRequest(context);
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    return this.composableEngine.processStreamingChunk(chunk, state);
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return this.composableEngine.finalizeStreamProcessing(state);
  }

  initStreamProcessingState(): StreamProcessingState {
    return this.composableEngine.initStreamProcessingState();
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return this.composableEngine.buildHistoricalAssistantMessage(currentLoopAssistantEvent);
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return this.composableEngine.buildHistoricalToolCallResultMessages(toolCallResults);
  }

  /**
   * Get the underlying composable engine instance for advanced operations
   */
  getComposableEngine(): ComposableToolCallEngine {
    return this.composableEngine;
  }
}

/**
 * Helper function to create a ComposableToolCallEngineFactory constructor
 */
export function createComposableToolCallEngineFactory(
  config: ToolCallEngineCompositionConfig,
): TConstructor<ToolCallEngine> {
  return class extends ComposableToolCallEngineFactory {
    constructor() {
      super(config);
    }
  };
}
