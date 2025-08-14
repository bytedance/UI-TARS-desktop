/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolCallEngine,
  ToolCallEnginePrepareRequestContext,
  StreamProcessingState,
  StreamChunkResult,
  ParsedModelResponse,
  getLogger,
  Tool,
} from '@tarko/agent';
import {
  ChatCompletionCreateParams,
  ChatCompletionChunk,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  MultimodalToolCallResult,
  AgentEventStream,
} from '@tarko/agent-interface';
import {
  ToolCallEngineProvider,
  ToolCallEngineContext,
  ToolCallEngineCompositionConfig,
} from './types';
import { assert } from 'console';

/**
 * Composable Tool Call Engine that orchestrates multiple tool call engines
 */
export class ComposableToolCallEngine extends ToolCallEngine {
  private logger = getLogger('ComposableToolCallEngine');
  private engines: ToolCallEngineProvider[];
  private defaultEngine: ToolCallEngineProvider;
  private activeEngine?: ToolCallEngine;

  constructor(config: ToolCallEngineCompositionConfig) {
    super();
    this.engines = [...config.engines].sort((a, b) => b.priority - a.priority);
    this.defaultEngine = config.defaultEngine || this.engines[0];

    assert(this.engines.length > 0 || !!this.defaultEngine, 'No tool call engines available');

    this.logger.info(`Initialized ComposableToolCallEngine with ${this.engines.length} engines`, {
      engines: this.engines.map((e) => `${e.name}(${e.priority})`),
    });
  }

  /**
   * Select the appropriate engine based on context
   */
  private selectEngine(context: ToolCallEngineContext): ToolCallEngine {
    for (const engineProvider of this.engines) {
      if (!engineProvider.canHandle || engineProvider.canHandle(context)) {
        // this.logger.debug(
        //   `Selected engine: ${engineProvider.name} (priority: ${engineProvider.priority})`,
        // );
        return engineProvider.getEngine();
      }
    }
    // this.logger.debug(`Using default engine: ${this.defaultEngine.name}`);
    return this.defaultEngine.getEngine();
  }

  preparePrompt(instructions: string, tools: Tool[]): string {
    return this.selectEngine({ tools }).preparePrompt(instructions, tools);
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return this.selectEngine({
      tools: context.tools || [],
      messageHistory: context.messages,
    }).prepareRequest(context);
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    return this.selectEngine({
      toolCalls: state.toolCalls,
      latestAssistantMessage: state.contentBuffer,
    }).processStreamingChunk(chunk, state);
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return this.selectEngine({
      latestAssistantMessage: state.contentBuffer,
    }).finalizeStreamProcessing(state);
  }

  initStreamProcessingState(): StreamProcessingState {
    try {
      return this.selectEngine({}).initStreamProcessingState();
    } catch (e) {
      this.logger.error('initStreamProcessingState err: ', e);
      return {
        contentBuffer: '',
        toolCalls: [],
        reasoningBuffer: '',
        finishReason: null,
      };
    }
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return this.defaultEngine
      .getEngine()
      .buildHistoricalAssistantMessage(currentLoopAssistantEvent);
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return this.defaultEngine.getEngine().buildHistoricalToolCallResultMessages(toolCallResults);
  }

  /**
   * Get information about available engines
   */
  getEngineInfo(): Array<{ name: string; priority: number; description?: string }> {
    return this.engines.map((engine) => ({
      name: engine.name,
      priority: engine.priority,
      description: engine.description,
    }));
  }

  /**
   * Get the currently active engine name
   */
  getActiveEngineName(): string | undefined {
    if (!this.activeEngine) return undefined;

    // Find the engine provider that created this active engine
    for (const engineProvider of this.engines) {
      if (engineProvider.getEngine() === this.activeEngine) {
        return engineProvider.name;
      }
    }
    return 'unknown';
  }
}
