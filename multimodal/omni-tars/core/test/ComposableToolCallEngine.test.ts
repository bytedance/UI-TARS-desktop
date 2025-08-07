/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ComposableToolCallEngine,
  ToolCallEngineCompositionConfig,
  ToolCallEngineProvider,
  ToolCallEngineContext,
} from '../src';
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
      strategy: 'priority',
    };
    composableEngine = new ComposableToolCallEngine(config);
  });

  describe('Engine Selection', () => {
    it('should select high priority engine when available', () => {
      const context: ToolCallEngineContext = {
        tools: [
          {
            function: {
              name: 'high_priority_tool',
              description: 'High priority tool',
              parameters: {},
            },
          },
        ],
        messages: [],
        model: 'gpt-4',
      };

      const prompt = composableEngine.preparePrompt('Test instructions', context.tools);
      expect(prompt).toContain('[HIGH]');
    });

    it('should select medium priority engine when high priority cannot handle', () => {
      const context: ToolCallEngineContext = {
        tools: [
          {
            function: {
              name: 'medium_priority_tool',
              description: 'Medium priority tool',
              parameters: {},
            },
          },
        ],
        messages: [],
        model: 'gpt-4',
      };

      const prompt = composableEngine.preparePrompt('Test instructions', context.tools);
      expect(prompt).toContain('[MEDIUM]');
    });

    it('should fallback to low priority engine when others cannot handle', () => {
      const context: ToolCallEngineContext = {
        tools: [
          {
            function: {
              name: 'unknown_tool',
              description: 'Unknown tool',
              parameters: {},
            },
          },
        ],
        messages: [],
        model: 'gpt-4',
      };

      const prompt = composableEngine.preparePrompt('Test instructions', context.tools);
      expect(prompt).toContain('[LOW]');
    });
  });

  describe('Strategy: first_match', () => {
    beforeEach(() => {
      config.strategy = 'first_match';
      composableEngine = new ComposableToolCallEngine(config);
    });

    it('should use first matching engine regardless of priority', () => {
      const context: ToolCallEngineContext = {
        tools: [
          {
            function: {
              name: 'high_priority_tool',
              description: 'High priority tool',
              parameters: {},
            },
          },
        ],
        messages: [],
        model: 'gpt-4',
      };

      const prompt = composableEngine.preparePrompt('Test instructions', context.tools);
      expect(prompt).toContain('[HIGH]');
    });
  });

  describe('Default Engine', () => {
    beforeEach(() => {
      config.defaultEngine = new MediumPriorityEngineProvider();
      config.engines = [new HighPriorityEngineProvider()]; // Only high priority engine
      composableEngine = new ComposableToolCallEngine(config);
    });

    it('should use default engine when no engine can handle', () => {
      const context: ToolCallEngineContext = {
        tools: [
          {
            function: {
              name: 'unknown_tool',
              description: 'Unknown tool',
              parameters: {},
            },
          },
        ],
        messages: [],
        model: 'gpt-4',
      };

      const prompt = composableEngine.preparePrompt('Test instructions', context.tools);
      expect(prompt).toContain('[MEDIUM]');
    });
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

  describe('Tool Call Engine Methods', () => {
    it('should delegate prepareRequest to selected engine', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4',
        messages: [],
        tools: [
          {
            function: {
              name: 'high_priority_tool',
              description: 'High priority tool',
              parameters: {},
            },
          },
        ],
      };

      const result = composableEngine.prepareRequest(context);
      expect(result.model).toBe('gpt-4');
      expect(result.stream).toBe(true);
    });

    it('should delegate processStreamingChunk to selected engine', () => {
      // First prepare prompt to select engine
      composableEngine.preparePrompt('Test', [
        {
          function: {
            name: 'high_priority_tool',
            description: 'High priority tool',
            parameters: {},
          },
        },
      ]);

      const chunk = {
        choices: [{ delta: { content: 'test' } }],
      } as ChatCompletionChunk;

      const state = composableEngine.initStreamProcessingState();
      const result = composableEngine.processStreamingChunk(chunk, state);

      expect(result.content).toContain('[HIGH]');
    });

    it('should delegate finalizeStreamProcessing to selected engine', () => {
      // First prepare prompt to select engine
      composableEngine.preparePrompt('Test', [
        {
          function: {
            name: 'high_priority_tool',
            description: 'High priority tool',
            parameters: {},
          },
        },
      ]);

      const state = composableEngine.initStreamProcessingState();
      const result = composableEngine.finalizeStreamProcessing(state);

      expect(result.content).toContain('[HIGH]');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no engines are available', () => {
      const emptyConfig: ToolCallEngineCompositionConfig = {
        engines: [],
        strategy: 'priority',
      };

      expect(() => {
        const emptyEngine = new ComposableToolCallEngine(emptyConfig);
        emptyEngine.preparePrompt('Test', []);
      }).toThrow('No tool call engines available');
    });
  });
});
