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

/**
 * Composable Tool Call Engine that orchestrates multiple tool call engines
 */
export class ComposableToolCallEngine extends ToolCallEngine {
  private logger = getLogger('ComposableToolCallEngine');
  private engines: ToolCallEngineProvider[];
  private strategy: 'priority' | 'first_match' | 'fallback';
  private defaultEngine?: ToolCallEngineProvider;
  private activeEngine?: ToolCallEngine;

  constructor(config: ToolCallEngineCompositionConfig) {
    super();
    this.engines = [...config.engines].sort((a, b) => b.priority - a.priority);
    this.strategy = config.strategy || 'priority';
    this.defaultEngine = config.defaultEngine;

    this.logger.info(`Initialized ComposableToolCallEngine with ${this.engines.length} engines`, {
      engines: this.engines.map((e) => `${e.name}(${e.priority})`),
      strategy: this.strategy,
    });
  }

  /**
   * Select the appropriate engine based on context
   */
  private selectEngine(context: ToolCallEngineContext): ToolCallEngine {
    this.logger.debug('Selecting engine for context', {
      tools: context.tools.map((t) => t.function.name),
      strategy: this.strategy,
    });

    switch (this.strategy) {
      case 'priority':
        // Use the highest priority engine that can handle the context
        for (const engineProvider of this.engines) {
          if (!engineProvider.canHandle || engineProvider.canHandle(context)) {
            this.logger.debug(
              `Selected engine: ${engineProvider.name} (priority: ${engineProvider.priority})`,
            );
            return engineProvider.getEngine();
          }
        }
        break;

      case 'first_match':
        // Use the first engine that can handle the context
        for (const engineProvider of this.engines) {
          if (engineProvider.canHandle && engineProvider.canHandle(context)) {
            this.logger.debug(`Selected engine: ${engineProvider.name} (first match)`);
            return engineProvider.getEngine();
          }
        }
        break;

      case 'fallback':
        // Try each engine in priority order, falling back to the next if one fails
        // For now, implement similar to priority, but could be enhanced with error handling
        for (const engineProvider of this.engines) {
          if (!engineProvider.canHandle || engineProvider.canHandle(context)) {
            this.logger.debug(`Selected engine: ${engineProvider.name} (fallback strategy)`);
            return engineProvider.getEngine();
          }
        }
        break;
    }

    // Use default engine if specified
    if (this.defaultEngine) {
      this.logger.debug(`Using default engine: ${this.defaultEngine.name}`);
      return this.defaultEngine.getEngine();
    }

    // Use the first available engine as last resort
    if (this.engines.length > 0) {
      const fallbackEngine = this.engines[0];
      this.logger.warn(`No suitable engine found, using fallback: ${fallbackEngine.name}`);
      return fallbackEngine.getEngine();
    }

    throw new Error('No tool call engines available');
  }

  preparePrompt(instructions: string, tools: Tool[]): string {
    const context: ToolCallEngineContext = {
      tools,
      messages: [],
    };

    this.activeEngine = this.selectEngine(context);
    return this.activeEngine.preparePrompt(instructions, tools);
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    const engineContext: ToolCallEngineContext = {
      tools: context.tools || [],
      messages: context.messages,
    };

    // Re-select engine with full context if needed
    if (!this.activeEngine) {
      this.activeEngine = this.selectEngine(engineContext);
    }

    return this.activeEngine.prepareRequest(context);
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    if (!this.activeEngine) {
      throw new Error('No active engine for processing streaming chunk');
    }
    return this.activeEngine.processStreamingChunk(chunk, state);
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    if (!this.activeEngine) {
      throw new Error('No active engine for finalizing stream processing');
    }
    return this.activeEngine.finalizeStreamProcessing(state);
  }

  initStreamProcessingState(): StreamProcessingState {
    if (!this.activeEngine) {
      // Return default state
      return {
        contentBuffer: '',
        toolCalls: [],
        reasoningBuffer: '',
        finishReason: null,
      };
    }
    return this.activeEngine.initStreamProcessingState();
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    if (!this.activeEngine) {
      // Return default message
      return {
        role: 'assistant',
        content: currentLoopAssistantEvent.content,
      };
    }
    return this.activeEngine.buildHistoricalAssistantMessage(currentLoopAssistantEvent);
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    if (!this.activeEngine) {
      // Return default messages
      return toolCallResults.map((result) => ({
        role: 'user' as const,
        content: `Tool "${result.toolName}" result: ${JSON.stringify(result.content)}`,
      }));
    }
    return this.activeEngine.buildHistoricalToolCallResultMessages(toolCallResults);
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
