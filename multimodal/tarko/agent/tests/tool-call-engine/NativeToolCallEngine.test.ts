/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Tool,
  z,
  getLogger,
  NativeToolCallEngine,
  ToolCallEnginePrepareRequestContext,
  MultimodalToolCallResult,
  ChatCompletionChunk,
} from './../../src';
import {
  createMockAssistantMessageEvent,
  createMockAssistantMessageEventWithToolCalls,
  createMockToolCall,
} from '../agent/kernel/utils/testUtils';

// Mock logger
vi.mock('../utils/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('NativeToolCallEngine', () => {
  let engine: NativeToolCallEngine;
  const mockLogger = getLogger('test');

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new NativeToolCallEngine();
  });

  describe('preparePrompt', () => {
    it('should return the original instructions without modifications', () => {
      const instructions = 'You are a helpful assistant that can use provided tools.';
      const tools: Tool[] = [];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toBe(instructions);
    });

    it('should return original instructions even with tools provided', () => {
      const instructions = 'You are a helpful assistant that can use provided tools.';
      const tools = [
        new Tool({
          id: 'testTool',
          description: 'A test tool',
          parameters: z.object({
            param: z.string().describe('A test parameter'),
          }),
          function: async () => 'test result',
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toBe(instructions);
    });
  });

  describe('prepareRequest', () => {
    it('should prepare request without tools', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "Hello",
              "role": "user",
            },
          ],
          "model": "gpt-4o",
          "stream": false,
          "temperature": 0.7,
          "top_p": undefined,
        }
      `);
    });

    it('should prepare request with tools', () => {
      const testTool = new Tool({
        id: 'testTool',
        description: 'A test tool',
        parameters: z.object({
          param: z.string().describe('A test parameter'),
        }),
        function: async () => 'test result',
      });

      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [testTool],
        temperature: 0.5,
      };

      const result = engine.prepareRequest(context);

      expect(result).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "Hello",
              "role": "user",
            },
          ],
          "model": "gpt-4o",
          "stream": false,
          "temperature": 0.5,
          "tools": [
            {
              "function": {
                "description": "A test tool",
                "name": "testTool",
                "parameters": {
                  "properties": {
                    "param": {
                      "description": "A test parameter",
                      "type": "string",
                    },
                  },
                  "required": [
                    "param",
                  ],
                  "type": "object",
                },
              },
              "type": "function",
            },
          ],
          "top_p": undefined,
        }
      `);
    });

    it('should prepare request with tools that use JSON schema', () => {
      const jsonSchemaTool = new Tool({
        id: 'jsonTool',
        description: 'A tool with JSON schema',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'User name',
            },
            age: {
              type: 'number',
              description: 'User age',
            },
          },
          required: ['name'],
        },
        function: async () => 'json result',
      });

      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [jsonSchemaTool],
        temperature: 0.5,
      };

      const result = engine.prepareRequest(context);

      expect(result).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "Hello",
              "role": "user",
            },
          ],
          "model": "gpt-4o",
          "stream": false,
          "temperature": 0.5,
          "tools": [
            {
              "function": {
                "description": "A tool with JSON schema",
                "name": "jsonTool",
                "parameters": {
                  "properties": {
                    "age": {
                      "description": "User age",
                      "type": "number",
                    },
                    "name": {
                      "description": "User name",
                      "type": "string",
                    },
                  },
                  "required": [
                    "name",
                  ],
                  "type": "object",
                },
              },
              "type": "function",
            },
          ],
          "top_p": undefined,
        }
      `);
    });

    it('should handle empty tools array by setting tools to undefined', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result.tools).toBeUndefined();
    });

    it('should include top_p parameter when provided', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        top_p: 0.9,
      };

      const result = engine.prepareRequest(context);

      expect(result.top_p).toBe(0.9);
      expect(result.temperature).toBe(0.7);
    });

    it('should handle undefined top_p parameter', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result.top_p).toBeUndefined();
      expect(result.temperature).toBe(0.7);
    });
  });

  describe('buildHistoricalAssistantMessage', () => {
    it('should build a message without tool calls', () => {
      const response = createMockAssistantMessageEvent({
        content: 'This is a test response',
        finishReason: 'stop',
      });

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "This is a test response",
          "role": "assistant",
        }
      `);
    });

    it('should build a message with tool calls', () => {
      const toolCalls = [createMockToolCall('testTool', { param: 'value' }, 'call_123')];
      const response = createMockAssistantMessageEventWithToolCalls(toolCalls, {
        content: 'I will help you with that',
      });

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "I will help you with that",
          "role": "assistant",
          "tool_calls": [
            {
              "function": {
                "arguments": "{"param":"value"}",
                "name": "testTool",
              },
              "id": "call_123",
              "type": "function",
            },
          ],
        }
      `);
    });
  });

  describe('buildHistoricalToolCallResultMessages', () => {
    it('should build tool result messages with text content only', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_123',
          toolName: 'testTool',
          content: [
            {
              type: 'text',
              text: '{"result":"success"}',
            },
          ],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "content": "{"result":"success"}",
            "role": "tool",
            "tool_call_id": "call_123",
          },
        ]
      `);
    });

    it('should build tool result messages with mixed content (text and image)', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_456',
          toolName: 'screenshotTool',
          content: [
            {
              type: 'text',
              text: '{"description":"A screenshot"}',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,iVBORw0KGgo',
              },
            },
          ],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "content": "{"description":"A screenshot"}",
            "role": "tool",
            "tool_call_id": "call_456",
          },
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,iVBORw0KGgo",
                },
                "type": "image_url",
              },
            ],
            "role": "user",
          },
        ]
      `);
    });

    it('should handle multiple tool results', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_123',
          toolName: 'textTool',
          content: [
            {
              type: 'text',
              text: '{"result":"text success"}',
            },
          ],
        },
        {
          toolCallId: 'call_456',
          toolName: 'imageTool',
          content: [
            {
              type: 'text',
              text: '{"description":"An image"}',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,/9j/4AAQ',
              },
            },
          ],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "content": "{"result":"text success"}",
            "role": "tool",
            "tool_call_id": "call_123",
          },
          {
            "content": "{"description":"An image"}",
            "role": "tool",
            "tool_call_id": "call_456",
          },
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/jpeg;base64,/9j/4AAQ",
                },
                "type": "image_url",
              },
            ],
            "role": "user",
          },
        ]
      `);
    });
  });

  describe('streaming processing', () => {
    describe('initStreamProcessingState', () => {
      it('should initialize empty streaming state', () => {
        const state = engine.initStreamProcessingState();

        expect(state).toEqual({
          contentBuffer: '',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: null,
        });
      });
    });

    describe('processStreamingChunk', () => {
      it('should handle basic content chunks', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: 'Hello world' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'gpt-4o',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.content).toBe('Hello world');
        expect(result.reasoningContent).toBe('');
        expect(result.hasToolCallUpdate).toBe(false);
        expect(state.contentBuffer).toBe('Hello world');
      });

      it('should handle reasoning content chunks', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              // @ts-expect-error Testing non-standard reasoning_content field
              delta: { reasoning_content: 'Let me think...' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'gpt-4o',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.reasoningContent).toBe('Let me think...');
        expect(state.reasoningBuffer).toBe('Let me think...');
      });

      it('should handle tool call initialization chunk', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call-123',
                    type: 'function',
                    function: { name: 'testTool' },
                  },
                ],
              },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'gpt-4o',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.hasToolCallUpdate).toBe(true);
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0].id).toBe('call-123');
        expect(result.toolCalls[0].function.name).toBe('testTool');
        expect(result.streamingToolCallUpdates).toHaveLength(1);
        expect(result.streamingToolCallUpdates?.[0].toolCallId).toBe('call-123');
        expect(result.streamingToolCallUpdates?.[0].toolName).toBe('testTool');
      });

      it('should handle tool call arguments chunk', () => {
        const state = engine.initStreamProcessingState();
        // Initialize tool call first
        state.toolCalls[0] = {
          id: 'call-123',
          type: 'function',
          function: { name: 'testTool', arguments: '{"param":' },
        };

        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: {
                tool_calls: [{ function: { arguments: '"value"}' }, index: 0 }],
              },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'gpt-4o',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.hasToolCallUpdate).toBe(true);
        expect(result.toolCalls[0].function.arguments).toBe('{"param":"value"}');
        expect(result.streamingToolCallUpdates?.[0].argumentsDelta).toBe('"value"}');
      });

      it('should handle finish reason', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: {},
              index: 0,
              finish_reason: 'tool_calls',
            },
          ],
          created: Date.now(),
          model: 'gpt-4o',
          object: 'chat.completion.chunk',
        };

        engine.processStreamingChunk(chunk, state);

        expect(state.finishReason).toBe('tool_calls');
      });

      it('should process real LLM response chunks from native tool call', () => {
        const state = engine.initStreamProcessingState();

        // Process chunks based on the real response data
        const chunks: Partial<ChatCompletionChunk>[] = [
          {
            choices: [
              {
                delta: {
                  content:
                    "To get the weather, we first need the user's current location. So call getCurrentLocation to retrieve that information.",
                },
                index: 0,
              },
            ],
          },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      function: { name: 'getCurrentLocation' },
                      id: 'call_test',
                      index: 0,
                      type: 'function',
                    },
                  ],
                },
                index: 0,
              },
            ],
          },
          {
            choices: [
              { delta: { tool_calls: [{ function: { arguments: '{}' }, index: 0 }] }, index: 0 },
            ],
          },
          {
            choices: [{ delta: {}, finish_reason: 'tool_calls', index: 0 }],
          },
        ];

        let finalResult;
        for (const chunk of chunks) {
          finalResult = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        }

        expect(state.contentBuffer).toContain('getCurrentLocation');
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('getCurrentLocation');
        expect(state.toolCalls[0].function.arguments).toBe('{}');
        expect(state.finishReason).toBe('tool_calls');
      });
    });

    describe('finalizeStreamProcessing', () => {
      it('should finalize with content only', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer = 'Final response';
        state.reasoningBuffer = 'Some reasoning';
        state.finishReason = 'stop';

        const result = engine.finalizeStreamProcessing(state);

        expect(result).toEqual({
          content: 'Final response',
          reasoningContent: 'Some reasoning',
          toolCalls: undefined,
          finishReason: 'stop',
        });
      });

      it('should finalize with tool calls', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer = 'Calling tool';
        state.toolCalls = [
          {
            id: 'call-123',
            type: 'function',
            function: { name: 'testTool', arguments: '{}' },
          },
        ];
        state.finishReason = 'tool_calls';

        const result = engine.finalizeStreamProcessing(state);

        expect(result).toEqual({
          content: 'Calling tool',
          reasoningContent: undefined,
          toolCalls: [
            {
              id: 'call-123',
              type: 'function',
              function: { name: 'testTool', arguments: '{}' },
            },
          ],
          finishReason: 'tool_calls',
        });
      });

      it('should handle empty state', () => {
        const state = engine.initStreamProcessingState();

        const result = engine.finalizeStreamProcessing(state);

        expect(result).toEqual({
          content: '',
          reasoningContent: undefined,
          toolCalls: undefined,
          finishReason: 'stop',
        });
      });
    });
  });
});
