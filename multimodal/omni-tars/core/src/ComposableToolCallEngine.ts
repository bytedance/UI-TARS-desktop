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
import { bypass_native_thinking } from './environments/prompt_t5';

/**
 * Composable Tool Call Engine that orchestrates multiple tool call engines
 */
export class ComposableToolCallEngine extends ToolCallEngine {
  private logger = getLogger('ComposableToolCallEngine');
  private engines: ToolCallEngineProvider[];
  private defaultEngineProvider: ToolCallEngineProvider;
  private activeEngine?: ToolCallEngine;

  constructor(config: ToolCallEngineCompositionConfig) {
    super();
    this.engines = [...config.engines].sort((a, b) => b.priority - a.priority);
    this.defaultEngineProvider = config.defaultEngine || this.engines[0];

    assert(
      this.engines.length > 0 || !!this.defaultEngineProvider,
      'No tool call engines available',
    );

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
    this.logger.debug(
      `No engine matched, using default engine: ${this.defaultEngineProvider.name}`,
    );
    return this.defaultEngineProvider.getEngine();
  }

  preparePrompt(instructions: string, tools: Tool[]) {
    return this.selectEngine({ tools }).preparePrompt(instructions, tools);
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    // FIXME temporary plan, use this way to avoid model service auto reasoning
    if (bypass_native_thinking) {
      context.messages.push({
        role: 'assistant',
        content: '',
      });
    }

    return this.selectEngine({
      tools: context.tools || [],
      messageHistory: context.messages,
    }).prepareRequest(context);
  }

  initStreamProcessingState(): StreamProcessingState {
    try {
      return this.defaultEngineProvider.getEngine().initStreamProcessingState();
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

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    return this.defaultEngineProvider.getEngine().processStreamingChunk(chunk, state);
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return this.selectEngine({
      toolCalls: state.toolCalls,
      latestAssistantMessage: state.contentBuffer,
    }).finalizeStreamProcessing(state);
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return this.defaultEngineProvider
      .getEngine()
      .buildHistoricalAssistantMessage(currentLoopAssistantEvent);
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return this.defaultEngineProvider
      .getEngine()
      .buildHistoricalToolCallResultMessages(toolCallResults);
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
