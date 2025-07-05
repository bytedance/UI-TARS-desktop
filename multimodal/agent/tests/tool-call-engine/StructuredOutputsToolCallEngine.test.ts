/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Tool,
  z,
  getLogger,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
  StructuredOutputsToolCallEngine,
  ChatCompletionChunk,
  StreamProcessingState,
} from './../../src';

// Mock logger
vi.mock('../utils/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('StructuredOutputsToolCallEngine', () => {
  let engine: StructuredOutputsToolCallEngine;
  const mockLogger = getLogger('test');

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new StructuredOutputsToolCallEngine();
  });

  describe('preparePrompt', () => {
    it('should return the original instructions when no tools are provided', () => {
      const instructions = 'You are a helpful assistant.';
      const tools: Tool[] = [];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toBe(instructions);
    });

    it('should enhance instructions with tool definitions and structured output format', () => {
      const instructions = 'You are a helpful assistant.';
      const tools = [
        new Tool({
          id: 'calculator',
          description: 'Performs mathematical calculations',
          parameters: z.object({
            operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
            a: z.number().describe('First number'),
            b: z.number().describe('Second number'),
          }),
          function: async () => 'calculation result',
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toMatchInlineSnapshot(`
        "You are a helpful assistant.

        AVAILABLE TOOLS:

        Tool name: calculator
        Description: Performs mathematical calculations
        Parameters: {
          "type": "object",
          "properties": {
            "operation": {
              "type": "string",
              "enum": [
                "add",
                "subtract",
                "multiply",
                "divide"
              ]
            },
            "a": {
              "type": "number",
              "description": "First number"
            },
            "b": {
              "type": "number",
              "description": "Second number"
            }
          },
          "required": [
            "operation",
            "a",
            "b"
          ]
        }


        When you need to use a tool:
        1. Respond with a structured JSON object with the following format:
        {
          "content": "Always include a brief, concise message about what you're doing or what information you're providing. Avoid lengthy explanations.",
          "toolCall": {
            "name": "the_exact_tool_name",
            "args": {
              // The arguments as required by the tool's parameter schema
            }
          }
        }
        IMPORTANT: Always include both "content" and "toolCall" when using a tool. The "content" should be brief but informative.

        If you want to provide a final answer without calling a tool:
        {
          "content": "Your complete and helpful response to the user"
        }"
      `);
    });

    it('should handle multiple tools with different schema types', () => {
      const instructions = 'You are a helpful assistant.';
      const tools = [
        new Tool({
          id: 'zodTool',
          description: 'Tool with Zod schema',
          parameters: z.object({
            query: z.string().describe('Search query'),
          }),
          function: async () => 'zod result',
        }),
        new Tool({
          id: 'jsonTool',
          description: 'Tool with JSON schema',
          parameters: {
            type: 'object',
            properties: {
              filename: {
                type: 'string',
                description: 'File name',
              },
              content: {
                type: 'string',
                description: 'File content',
              },
            },
            required: ['filename'],
          },
          function: async () => 'json result',
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toContain('Tool name: zodTool');
      expect(result).toContain('Tool name: jsonTool');
      expect(result).toContain('Search query');
      expect(result).toContain('File name');
      expect(result).toContain('structured JSON object');
    });

    it('should handle tools with complex nested schemas', () => {
      const instructions = 'You are a helpful assistant.';
      const tools = [
        new Tool({
          id: 'complexTool',
          description: 'Tool with complex nested schema',
          parameters: z.object({
            config: z.object({
              enabled: z.boolean(),
              settings: z.object({
                timeout: z.number().optional(),
                retries: z.number().default(3),
              }),
            }),
            items: z.array(z.string()),
          }),
          function: async () => 'complex result',
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toContain('complexTool');
      expect(result).toContain('Tool with complex nested schema');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"type": "array"');
    });
  });

  describe('prepareRequest', () => {
    it('should prepare request without tools', () => {
      const context: PrepareRequestContext = {
        model: 'doubao-1.5-thinking-vision-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result).toMatchObject({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'doubao-1.5-thinking-vision-pro',
        temperature: 0.7,
        stream: true,
      });

      // Should not have response_format when no tools
      expect(result.response_format).toBeUndefined();
    });

    it('should prepare request with tools and JSON schema response format', () => {
      const testTool = new Tool({
        id: 'testTool',
        description: 'A test tool',
        parameters: z.object({
          param: z.string().describe('A test parameter'),
        }),
        function: async () => 'test result',
      });

      const context: PrepareRequestContext = {
        model: 'doubao-1.5-thinking-vision-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [testTool],
        temperature: 0.5,
      };

      const result = engine.prepareRequest(context);

      expect(result).toMatchObject({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'doubao-1.5-thinking-vision-pro',
        temperature: 0.5,
        stream: true,
      });

      // Should have JSON schema response format
      expect(result.response_format).toEqual({
        type: 'json_schema',
        json_schema: {
          name: 'agent_response_schema',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Your response text to the user',
              },
              toolCall: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The exact name of the tool to call',
                  },
                  args: {
                    type: 'object',
                    description: 'The arguments for the tool call',
                  },
                },
                required: ['name', 'args'],
              },
            },
            anyOf: [{ required: ['content'] }, { required: ['toolCall'] }],
          },
        },
      });
    });

    it('should handle empty tools array by not adding response format', () => {
      const context: PrepareRequestContext = {
        model: 'doubao-1.5-thinking-vision-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result.response_format).toBeUndefined();
    });

    it('should use default temperature when not specified', () => {
      const context: PrepareRequestContext = {
        model: 'doubao-1.5-thinking-vision-pro',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = engine.prepareRequest(context);

      expect(result.temperature).toBe(0.7);
    });
  });

  describe('streaming processing', () => {
    describe('initStreamProcessingState', () => {
      it('should initialize with empty state', () => {
        const state = engine.initStreamProcessingState();

        expect(state).toEqual({
          contentBuffer: '',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: null,
          lastParsedContent: '',
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
              delta: { content: '{"content": "Hello"' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.content).toBe('Hello');
        expect(result.reasoningContent).toBe('');
        expect(result.hasToolCallUpdate).toBe(false);
        expect(state.contentBuffer).toBe('{"content": "Hello"');
      });

      it('should extract content from complete JSON and provide incremental updates', () => {
        const state = engine.initStreamProcessingState();

        // First chunk with partial JSON
        const chunk1: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: '{"content": "Hello' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        let result = engine.processStreamingChunk(chunk1, state);
        expect(result.content).toBe('Hello');

        // Second chunk completing the JSON
        const chunk2: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: ' world"}' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        result = engine.processStreamingChunk(chunk2, state);
        expect(result.content).toBe(' world');
        expect(state.lastParsedContent).toBe('Hello world');
      });

      it('should handle incremental content updates', () => {
        const state = engine.initStreamProcessingState();
        state.lastParsedContent = 'Hello';

        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: ', how are you?"}' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        // Set up the buffer to have a partial JSON that will become complete
        state.contentBuffer = '{"content": "Hello';

        const result = engine.processStreamingChunk(chunk, state);

        // Should only return the incremental part
        expect(result.content).toBe(', how are you?');
        expect(state.lastParsedContent).toBe('Hello, how are you?');
      });

      it('should handle JSON with tool call', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: {
                content:
                  '{"content": "Calculating", "toolCall": {"name": "calculator", "args": {"a": 5, "b": 3}}}',
              },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.content).toBe('Calculating');
        expect(result.hasToolCallUpdate).toBe(true);
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0].function.name).toBe('calculator');
        expect(result.toolCalls[0].function.arguments).toBe('{"a":5,"b":3}');
        expect(result.streamingToolCallUpdates).toHaveLength(1);
        expect(result.streamingToolCallUpdates?.[0].isComplete).toBe(true);
      });

      it('should handle reasoning content', () => {
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
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.reasoningContent).toBe('Let me think...');
        expect(state.reasoningBuffer).toBe('Let me think...');
      });

      it('should handle finish reason', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: {},
              index: 0,
              finish_reason: 'stop',
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        engine.processStreamingChunk(chunk, state);

        expect(state.finishReason).toBe('stop');
      });

      it('should handle malformed JSON gracefully', () => {
        const state = engine.initStreamProcessingState();
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: '{"content": "Hello' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        // Should not crash and should not extract content from malformed JSON
        expect(result.content).toBe('Hello');
        expect(result.hasToolCallUpdate).toBe(false);
      });
    });

    describe('finalizeStreamProcessing', () => {
      it('should finalize with complete JSON content', () => {
        const state: StreamProcessingState = {
          contentBuffer: '{"content": "Final answer"}',
          toolCalls: [],
          reasoningBuffer: 'Some reasoning',
          finishReason: 'stop',
          lastParsedContent: '',
        };

        const result = engine.finalizeStreamProcessing(state);

        expect(result).toEqual({
          content: 'Final answer',
          reasoningContent: 'Some reasoning',
          toolCalls: undefined,
          finishReason: 'stop',
        });
      });

      it('should finalize with tool call', () => {
        const state: StreamProcessingState = {
          contentBuffer:
            '{"content": "Using calculator", "toolCall": {"name": "calculator", "args": {"a": 1, "b": 2}}}',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: null,
          lastParsedContent: '',
        };

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Using calculator');
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('calculator');
        expect(result.toolCalls?.[0].function.arguments).toBe('{"a":1,"b":2}');
        expect(result.finishReason).toBe('tool_calls');
      });

      it('should handle malformed JSON in finalization', () => {
        const state: StreamProcessingState = {
          contentBuffer: '{"content": "Incomplete',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: 'stop',
          lastParsedContent: '',
        };

        const result = engine.finalizeStreamProcessing(state);

        // Should use the original buffer content when JSON parsing fails
        expect(result.content).toBe('Incomplete');
        expect(result.finishReason).toBe('stop');
      });

      it('should prioritize tool calls over content-only finish reason', () => {
        const state: StreamProcessingState = {
          contentBuffer: '{"content": "Using tool", "toolCall": {"name": "test", "args": {}}}',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: 'stop',
          lastParsedContent: '',
        };

        const result = engine.finalizeStreamProcessing(state);

        expect(result.finishReason).toBe('tool_calls');
        expect(result.toolCalls).toHaveLength(1);
      });

      it('should handle empty content buffer', () => {
        const state: StreamProcessingState = {
          contentBuffer: '',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: 'stop',
          lastParsedContent: '',
        };

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('');
        expect(result.finishReason).toBe('stop');
      });
    });
  });

  describe('buildHistoricalAssistantMessage', () => {
    it('should build a message without tool calls', () => {
      const response: AgentSingleLoopReponse = {
        content: 'This is a test response',
      };

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result).toEqual({
        role: 'assistant',
        content: 'This is a test response',
      });
    });

    it('should build a message with tool calls (ignoring tool_calls field)', () => {
      const response: AgentSingleLoopReponse = {
        content: 'I will calculate that for you',
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'calculator',
              arguments: '{"a":5,"b":3}',
            },
          },
        ],
      };

      const result = engine.buildHistoricalAssistantMessage(response);

      // Structured outputs engine doesn't use tool_calls field
      expect(result).toEqual({
        role: 'assistant',
        content: 'I will calculate that for you',
      });
      expect(result.tool_calls).toBeUndefined();
    });

    it('should handle empty content', () => {
      const response: AgentSingleLoopReponse = {
        content: '',
      };

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result).toEqual({
        role: 'assistant',
        content: '',
      });
    });
  });

  describe('buildHistoricalToolCallResultMessages', () => {
    it('should build tool result messages with text content only', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_123',
          toolName: 'calculator',
          content: [
            {
              type: 'text',
              text: '{"result": 8}',
            },
          ],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toEqual([
        {
          role: 'user',
          content: 'Tool: calculator\nResult:\n{"result": 8}',
        },
      ]);
    });

    it('should build tool result messages with mixed content (text and image)', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_456',
          toolName: 'screenshot',
          content: [
            {
              type: 'text',
              text: '{"status": "success"}',
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

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Tool: screenshot\nResult:\n{"status": "success"}',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,iVBORw0KGgo',
              },
            },
          ],
        },
      ]);
    });

    it('should handle multiple tool results', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_123',
          toolName: 'calculator',
          content: [
            {
              type: 'text',
              text: '{"result": 8}',
            },
          ],
        },
        {
          toolCallId: 'call_456',
          toolName: 'weather',
          content: [
            {
              type: 'text',
              text: '{"temperature": "22°C", "condition": "sunny"}',
            },
          ],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toEqual([
        {
          role: 'user',
          content: 'Tool: calculator\nResult:\n{"result": 8}',
        },
        {
          role: 'user',
          content: 'Tool: weather\nResult:\n{"temperature": "22°C", "condition": "sunny"}',
        },
      ]);
    });

    it('should handle empty tool results array', () => {
      const toolResults: MultimodalToolCallResult[] = [];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toEqual([]);
    });

    it('should handle tool result with only non-text content', () => {
      const toolResults: MultimodalToolCallResult[] = [
        {
          toolCallId: 'call_789',
          toolName: 'imageGenerator',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,generated_image_data',
              },
            },
          ],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolResults);

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Tool: imageGenerator\nResult:\n',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,generated_image_data',
              },
            },
          ],
        },
      ]);
    });
  });
});
