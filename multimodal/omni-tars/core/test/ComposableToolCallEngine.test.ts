/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolCallEngineProvider, ToolCallEngineContext } from '../src';
import { ToolCallEngine, Tool } from '@tarko/agent';
import {
  ToolCallEnginePrepareRequestContext,
  StreamProcessingState,
  StreamChunkResult,
  ParsedModelResponse,
  ChatCompletionCreateParams,
  ChatCompletionChunk,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  MultimodalToolCallResult,
  AgentEventStream,
} from '@tarko/agent-interface';
import { ToolCallEngineCompositionConfig } from '../src/types';
import { ComposableToolCallEngine } from '../src/ComposableToolCallEngine';

// Mock Tool Call Engine for testing
class MockToolCallEngine extends ToolCallEngine {
  constructor(private engineName: string) {
    super();
  }

  preparePrompt(instructions: string, tools: Tool[]): string {
    return `[${this.engineName}] ${instructions}`;
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      temperature: 0.7,
      stream: true,
    };
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    return {
      content: `[${this.engineName}] chunk`,
      reasoningContent: '',
      hasToolCallUpdate: false,
      toolCalls: [],
    };
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return {
      content: `[${this.engineName}] response`,
      rawContent: state.contentBuffer,
      reasoningContent: '',
      toolCalls: [],
      finishReason: 'stop',
    };
  }

  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
    };
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return {
      role: 'assistant',
      content: `[${this.engineName}] ${currentLoopAssistantEvent.content}`,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return toolCallResults.map((result) => ({
      role: 'user' as const,
      content: `[${this.engineName}] ${result.toolName} result`,
    }));
  }
}

// Mock Tool Call Engine Providers
class HighPriorityEngineProvider extends ToolCallEngineProvider<MockToolCallEngine> {
  readonly name = 'high-priority-engine';
  readonly priority = 100;
  readonly description = 'High priority test engine';

  protected createEngine(): MockToolCallEngine {
    return new MockToolCallEngine('HIGH');
  }

  canHandle(context: ToolCallEngineContext): boolean {
    return context.tools.some((tool) => tool.function.name.includes('high_priority'));
  }
}

class MediumPriorityEngineProvider extends ToolCallEngineProvider<MockToolCallEngine> {
  readonly name = 'medium-priority-engine';
  readonly priority = 50;
  readonly description = 'Medium priority test engine';

  protected createEngine(): MockToolCallEngine {
    return new MockToolCallEngine('MEDIUM');
  }

  canHandle(context: ToolCallEngineContext): boolean {
    return context.tools.some((tool) => tool.function.name.includes('medium_priority'));
  }
}

class LowPriorityEngineProvider extends ToolCallEngineProvider<MockToolCallEngine> {
  readonly name = 'low-priority-engine';
  readonly priority = 10;
  readonly description = 'Low priority test engine';

  protected createEngine(): MockToolCallEngine {
    return new MockToolCallEngine('LOW');
  }

  canHandle(): boolean {
    return true; // Always can handle as fallback
  }
}

describe('ComposableToolCallEngine', () => {
  let config: ToolCallEngineCompositionConfig;
  let composableEngine: ComposableToolCallEngine;

  beforeEach(() => {
    config = {
      engines: [
        new HighPriorityEngineProvider(),
        new MediumPriorityEngineProvider(),
        new LowPriorityEngineProvider(),
      ],
    };
    composableEngine = new ComposableToolCallEngine(config);
  });

  describe('Engine Info', () => {
    it('should return information about all engines', () => {
      const engineInfo = composableEngine.getEngineInfo();

      expect(engineInfo).toHaveLength(3);
      expect(engineInfo[0]).toEqual({
        name: 'high-priority-engine',
        priority: 100,
        description: 'High priority test engine',
      });
      expect(engineInfo[1]).toEqual({
        name: 'medium-priority-engine',
        priority: 50,
        description: 'Medium priority test engine',
      });
      expect(engineInfo[2]).toEqual({
        name: 'low-priority-engine',
        priority: 10,
        description: 'Low priority test engine',
      });
    });
  });
});
