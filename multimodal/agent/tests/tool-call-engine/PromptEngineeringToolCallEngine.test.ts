/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Tool,
  z,
  getLogger,
  ChatCompletionChunk,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
  PromptEngineeringToolCallEngine,
  StreamChunkResult,
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

describe('PromptEngineeringToolCallEngine', () => {
  let engine: PromptEngineeringToolCallEngine;
  const mockLogger = getLogger('test');

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new PromptEngineeringToolCallEngine();
  });

  describe('preparePrompt', () => {
    it('should return the original instructions when no tools are provided', () => {
      const instructions = 'You are a helpful assistant.';
      const tools: Tool[] = [];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toBe(instructions);
    });

    it('should enhance instructions with tool descriptions', () => {
      const instructions = 'You are a helpful assistant.';
      const tools = [
        new Tool({
          id: 'testTool',
          description: 'A test tool',
          parameters: z.object({
            param: z.string().describe('A test parameter'),
            optionalParam: z.number().optional().describe('An optional parameter'),
          }),
          function: async () => 'test result',
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toMatchInlineSnapshot(`
        "You are a helpful assistant.

        You have access to the following tools:

        ## testTool

        Description: A test tool

        Parameters:
        - param (required): A test parameter (type: string)
        - optionalParam: An optional parameter (type: number)

        To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string:

        <tool_call>
        {
          "name": "tool_name",
          "parameters": {
            "param1": "value1",
            "param2": "value2"
          }
        }
        </tool_call>

        If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.

        When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
        "
      `);
    });

    it('should handle multiple tools', () => {
      const instructions = 'You are a helpful assistant.';
      const tools = [
        new Tool({
          id: 'tool1',
          description: 'First tool',
          parameters: z.object({
            param1: z.string().describe('First parameter'),
          }),
          function: async () => 'result 1',
        }),
        new Tool({
          id: 'tool2',
          description: 'Second tool',
          parameters: z.object({
            param2: z.boolean().describe('Second parameter'),
          }),
          function: async () => 'result 2',
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toMatchInlineSnapshot(`
        "You are a helpful assistant.

        You have access to the following tools:

        ## tool1

        Description: First tool

        Parameters:
        - param1 (required): First parameter (type: string)

        ## tool2

        Description: Second tool

        Parameters:
        - param2 (required): Second parameter (type: boolean)

        To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string:

        <tool_call>
        {
          "name": "tool_name",
          "parameters": {
            "param1": "value1",
            "param2": "value2"
          }
        }
        </tool_call>

        If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.

        When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
        "
      `);
    });

    it('should handle tools with JSON schema parameters', () => {
      const instructions = 'You are a helpful assistant.';
      const tools = [
        new Tool({
          id: 'jsonTool',
          description: 'JSON schema tool',
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
        }),
      ];

      const result = engine.preparePrompt(instructions, tools);

      expect(result).toMatchInlineSnapshot(`
        "You are a helpful assistant.

        You have access to the following tools:

        ## jsonTool

        Description: JSON schema tool

        Parameters:
        - name (required): User name (type: string)
        - age: User age (type: number)

        To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string:

        <tool_call>
        {
          "name": "tool_name",
          "parameters": {
            "param1": "value1",
            "param2": "value2"
          }
        }
        </tool_call>

        If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.

        When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
        "
      `);
    });
  });

  describe('prepareRequest', () => {
    it('should prepare request without modifying original context', () => {
      const context: PrepareRequestContext = {
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      // Claude doesn't use tool parameters in the request
      expect(result).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "Hello",
              "role": "user",
            },
          ],
          "model": "claude-3-5-sonnet",
          "stream": false,
          "temperature": 0.7,
        }
      `);
    });

    it('should ignore tools in the request since they are in the prompt', () => {
      const testTool = new Tool({
        id: 'testTool',
        description: 'A test tool',
        parameters: z.object({
          param: z.string().describe('A test parameter'),
        }),
        function: async () => 'test result',
      });

      const context: PrepareRequestContext = {
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [testTool],
        temperature: 0.5,
      };

      const result = engine.prepareRequest(context);

      // Tools are not included in request for Claude
      expect(result).toMatchInlineSnapshot(`
        {
          "messages": [
            {
              "content": "Hello",
              "role": "user",
            },
          ],
          "model": "claude-3-5-sonnet",
          "stream": false,
          "temperature": 0.5,
        }
      `);
    });
  });

  describe('buildHistoricalAssistantMessage', () => {
    it('should build a message without tool calls', () => {
      const response = {
        content: 'This is a test response',
      };

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "This is a test response",
          "role": "assistant",
        }
      `);
    });

    it('should build a message with tool calls embedded in content', () => {
      const response: AgentSingleLoopReponse = {
        content: `I'll help you with that.

<tool_call>
{
  "name": "testTool",
  "parameters": {
    "param": "value"
  }
}
</tool_call>`,
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'testTool',
              arguments: '{"param":"value"}',
            },
          },
        ],
      };

      const result = engine.buildHistoricalAssistantMessage(response);

      // Claude doesn't support tool_calls field, only includes content
      expect(result).toMatchInlineSnapshot(`
        {
          "content": "I'll help you with that.

        <tool_call>
        {
          "name": "testTool",
          "parameters": {
            "param": "value"
          }
        }
        </tool_call>",
          "role": "assistant",
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
            "content": "Tool: testTool
        Result:
        {"result":"success"}",
            "role": "user",
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
            "content": [
              {
                "text": "Tool: screenshotTool
        Result:
        {"description":"A screenshot"}",
                "type": "text",
              },
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
            "content": "Tool: textTool
        Result:
        {"result":"text success"}",
            "role": "user",
          },
          {
            "content": [
              {
                "text": "Tool: imageTool
        Result:
        {"description":"An image"}",
                "type": "text",
              },
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
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.content).toBe('Hello world');
        expect(result.reasoningContent).toBe('');
        expect(result.hasToolCallUpdate).toBe(false);
        expect(state.contentBuffer).toBe('Hello world');
      });

      it('should filter out tool call tags in real-time', () => {
        const state = engine.initStreamProcessingState();

        // Simulate streaming chunks that build up a tool call tag
        const chunks = [
          { delta: { content: 'I will help you.<' } },
          { delta: { content: 'tool_call>' } },
          { delta: { content: '\n{"name": "testTool"' } },
          { delta: { content: ', "parameters": {}}' } },
          { delta: { content: '\n</tool_call>' } },
        ];

        let lastResult: StreamChunkResult;
        for (const chunkData of chunks) {
          const chunk: ChatCompletionChunk = {
            id: 'chunk-1',
            choices: [{ ...chunkData, index: 0, finish_reason: null }],
            created: Date.now(),
            model: 'claude-3-5-sonnet',
            object: 'chat.completion.chunk',
          };
          lastResult = engine.processStreamingChunk(chunk, state);
        }

        // Should filter out tool call content and extract tool calls
        expect(state.contentBuffer).toBe('I will help you.');
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('testTool');
      });

      it.skip('should handle partial tool call tags correctly', () => {
        const state = engine.initStreamProcessingState();

        // Test partial tag detection
        const chunk1: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: 'Text before <tool' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        const result1 = engine.processStreamingChunk(chunk1, state);

        // Should not send content that might be part of a tool call tag
        expect(result1.content).toBe('Text before ');

        const chunk2: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: '_call>content</tool_call>' },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        const result2 = engine.processStreamingChunk(chunk2, state);

        // Should now have a complete tool call
        expect(state.toolCalls).toHaveLength(1);
      });

      it('should process real LLM response chunks from prompt engineering', () => {
        const state = engine.initStreamProcessingState();

        // Process chunks based on the real prompt engineering response
        const realContent =
          '<tool_call>\n{\n  "name": "getCurrentLocation",\n  "parameters": {}\n}\n</tool_call>';

        // Split into chunks to simulate streaming
        const chunks = realContent.split('').map((char) => ({
          choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
        }));

        // Add final chunk with finish reason
        chunks.push({
          choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
        });

        for (const chunk of chunks) {
          engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        }

        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('getCurrentLocation');
        expect(state.toolCalls[0].function.arguments).toBe('{}');
        expect(state.finishReason).toBe('stop');
        expect(state.contentBuffer).toBe(''); // Tool call content should be filtered out
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
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.reasoningContent).toBe('Let me think...');
        expect(state.reasoningBuffer).toBe('Let me think...');
      });
    });

    describe('tool call extraction', () => {
      it('should extract single tool call correctly', () => {
        const content =
          'Some text <tool_call>\n{"name": "testTool", "parameters": {"param": "value"}}\n</tool_call> more text';

        // Use a method to access private extractToolCalls
        const state = engine.initStreamProcessingState();
        state.contentBuffer = content;

        const result = engine.finalizeStreamProcessing(state);

        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('testTool');
        expect(result.toolCalls?.[0].function.arguments).toBe('{"param":"value"}');
        expect(result.content).toBe('Some text  more text');
      });

      it('should extract multiple tool calls correctly', () => {
        const content =
          '<tool_call>\n{"name": "tool1", "parameters": {}}\n</tool_call> and <tool_call>\n{"name": "tool2", "parameters": {"x": 1}}\n</tool_call>';

        const state = engine.initStreamProcessingState();
        state.contentBuffer = content;

        const result = engine.finalizeStreamProcessing(state);

        expect(result.toolCalls).toHaveLength(2);
        expect(result.toolCalls?.[0].function.name).toBe('tool1');
        expect(result.toolCalls?.[1].function.name).toBe('tool2');
        expect(result.content).toBe('and');
      });

      it('should handle malformed JSON in tool calls', () => {
        const content = '<tool_call>\n{"name": "testTool", invalid json\n</tool_call>';

        const state = engine.initStreamProcessingState();
        state.contentBuffer = content;

        const result = engine.finalizeStreamProcessing(state);

        // Should not extract tool calls with invalid JSON
        expect(result.toolCalls).toBeUndefined();
        expect(result.content).toBe('');
      });
    });

    describe('finalizeStreamProcessing', () => {
      it('should finalize with tool calls extracted', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer =
          'Text <tool_call>\n{"name": "testTool", "parameters": {}}\n</tool_call>';
        state.reasoningBuffer = 'Some reasoning';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Text');
        expect(result.reasoningContent).toBe('Some reasoning');
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('testTool');
        expect(result.finishReason).toBe('tool_calls');
      });

      it('should finalize with content only when no tool calls', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer = 'Just regular text response';
        state.finishReason = 'stop';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Just regular text response');
        expect(result.toolCalls).toBeUndefined();
        expect(result.finishReason).toBe('stop');
      });
    });
  });

  describe('streaming processing with state machine', () => {
    describe('initStreamProcessingState', () => {
      it('should initialize extended streaming state', () => {
        const state = engine.initStreamProcessingState();

        expect(state).toMatchObject({
          contentBuffer: '',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: null,
        });

        // Check extended properties exist (they are private but affect behavior)
        expect(state).toBeDefined();
      });
    });

    describe('processStreamingChunk with state machine', () => {
      it('should handle normal content chunks without tool calls', () => {
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
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.content).toBe('Hello world');
        expect(result.reasoningContent).toBe('');
        expect(result.hasToolCallUpdate).toBe(false);
        expect(state.contentBuffer).toBe('Hello world');
      });

      it('should handle tool call spread across multiple chunks correctly', () => {
        const state = engine.initStreamProcessingState();

        // Simulate tool call chunks that arrive separately
        const chunks = [
          { delta: { content: 'I will help you with that. ' } },
          { delta: { content: '<tool_call>' } },
          { delta: { content: '\n{' } },
          { delta: { content: '\n  "name": "testTool",' } },
          { delta: { content: '\n  "parameters": {}' } },
          { delta: { content: '\n}' } },
          { delta: { content: '\n</tool_call>' } },
        ];

        let accumulatedContent = '';
        let hasToolCallUpdate = false;
        const toolCallUpdates: any[] = [];

        for (const chunkData of chunks) {
          const chunk: ChatCompletionChunk = {
            id: 'chunk-1',
            choices: [{ ...chunkData, index: 0, finish_reason: null }],
            created: Date.now(),
            model: 'claude-3-5-sonnet',
            object: 'chat.completion.chunk',
          };

          const result = engine.processStreamingChunk(chunk, state);
          accumulatedContent += result.content;

          if (result.hasToolCallUpdate && result.streamingToolCallUpdates) {
            hasToolCallUpdate = true;
            toolCallUpdates.push(...result.streamingToolCallUpdates);
          }
        }

        // Should emit content before tool call
        expect(accumulatedContent).toBe('I will help you with that. ');

        // Should have detected tool call updates
        expect(hasToolCallUpdate).toBe(true);
        expect(toolCallUpdates.length).toBeGreaterThan(0);

        // Should have extracted the tool call
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('testTool');
      });

      it('should handle complex tool call with parameters', () => {
        const state = engine.initStreamProcessingState();

        const toolCallJson =
          '<tool_call>\n{\n  "name": "calculator",\n  "parameters": {\n    "operation": "add",\n    "a": 5,\n    "b": 3\n  }\n}\n</tool_call>';

        // Split into individual characters to simulate real streaming
        const chunks = toolCallJson.split('').map((char) => ({
          choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
        }));

        let hasToolCallUpdate = false;
        const toolCallUpdates: any[] = [];

        for (const chunk of chunks) {
          const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);

          if (result.hasToolCallUpdate && result.streamingToolCallUpdates) {
            hasToolCallUpdate = true;
            toolCallUpdates.push(...result.streamingToolCallUpdates);
          }
        }

        expect(hasToolCallUpdate).toBe(true);
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('calculator');

        const args = JSON.parse(state.toolCalls[0].function.arguments);
        expect(args).toEqual({
          operation: 'add',
          a: 5,
          b: 3,
        });
      });

      it('should handle content mixed with tool calls', () => {
        const state = engine.initStreamProcessingState();

        const mixedContent =
          'Let me help you. <tool_call>\n{"name": "helper", "parameters": {}}\n</tool_call> Done!';

        const chunks = mixedContent.split('').map((char) => ({
          choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
        }));

        let accumulatedContent = '';
        let hasToolCallUpdate = false;

        for (const chunk of chunks) {
          const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
          accumulatedContent += result.content;

          if (result.hasToolCallUpdate) {
            hasToolCallUpdate = true;
          }
        }

        expect(accumulatedContent).toBe('Let me help you.  Done!');
        expect(hasToolCallUpdate).toBe(true);
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('helper');
      });

      it.skip('should handle false positive tool call tags', () => {
        const state = engine.initStreamProcessingState();

        const falsePositiveContent = 'This is <not_a_tool_call> and <another_tag> content.';

        const chunks = falsePositiveContent.split('').map((char) => ({
          choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
        }));

        let accumulatedContent = '';

        for (const chunk of chunks) {
          const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
          accumulatedContent += result.content;
        }

        expect(accumulatedContent).toBe(falsePositiveContent);
        expect(state.toolCalls).toHaveLength(0);
      });

      it('should handle incomplete tool call at end of stream', () => {
        const state = engine.initStreamProcessingState();

        const incompleteContent = 'Processing... <tool_call>\n{"name": "incomplete"';

        const chunks = incompleteContent.split('').map((char) => ({
          choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
        }));

        let accumulatedContent = '';

        for (const chunk of chunks) {
          const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
          accumulatedContent += result.content;
        }

        expect(accumulatedContent).toBe('Processing... ');
        // Incomplete tool call should not be added to toolCalls during streaming
        expect(state.toolCalls).toHaveLength(0);
      });

      it('should process real LLM response chunks correctly', () => {
        const state = engine.initStreamProcessingState();

        // Based on the real prompt engineering response from the snapshot
        const realChunks = [
          '<',
          'tool',
          '_call',
          '>\n',
          '{',
          '\n',
          ' ',
          ' "',
          'name',
          '":',
          ' "',
          'get',
          'Weather',
          '",',
          '\n',
          ' ',
          ' "',
          'parameters',
          '":',
          ' {',
          '\n',
          '   ',
          ' "',
          'location',
          '":',
          ' "',
          'Boston',
          '"',
          '\n',
          ' ',
          ' }',
          '\n',
          '}',
          '\n',
          '</',
          'tool',
          '_call',
          '>',
        ];

        let hasToolCallUpdate = false;
        const toolCallUpdates: any[] = [];

        for (const chunkContent of realChunks) {
          const chunk: ChatCompletionChunk = {
            id: 'chunk-1',
            choices: [
              {
                delta: { content: chunkContent },
                index: 0,
                finish_reason: null,
              },
            ],
            created: Date.now(),
            model: 'claude-3-5-sonnet',
            object: 'chat.completion.chunk',
          };

          const result = engine.processStreamingChunk(chunk, state);

          if (result.hasToolCallUpdate && result.streamingToolCallUpdates) {
            hasToolCallUpdate = true;
            toolCallUpdates.push(...result.streamingToolCallUpdates);
          }
        }

        expect(hasToolCallUpdate).toBe(true);
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('getWeather');

        const args = JSON.parse(state.toolCalls[0].function.arguments);
        expect(args).toEqual({ location: 'Boston' });

        // Should have tool call updates during streaming
        expect(toolCallUpdates.length).toBeGreaterThan(0);
        expect(toolCallUpdates.some((update) => update.isComplete)).toBe(true);
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
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);

        expect(result.reasoningContent).toBe('Let me think...');
        expect(state.reasoningBuffer).toBe('Let me think...');
      });

      it('should handle finish reason correctly', () => {
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
          model: 'claude-3-5-sonnet',
          object: 'chat.completion.chunk',
        };

        engine.processStreamingChunk(chunk, state);

        expect(state.finishReason).toBe('stop');
      });
    });

    describe('finalizeStreamProcessing with state machine', () => {
      it('should finalize with tool calls extracted', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer =
          'Text <tool_call>\n{"name": "testTool", "parameters": {}}\n</tool_call>';
        state.reasoningBuffer = 'Some reasoning';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Text');
        expect(result.reasoningContent).toBe('Some reasoning');
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('testTool');
        expect(result.finishReason).toBe('tool_calls');
      });

      it('should finalize with content only when no tool calls', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer = 'Just regular text response';
        state.finishReason = 'stop';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Just regular text response');
        expect(result.toolCalls).toBeUndefined();
        expect(result.finishReason).toBe('stop');
      });

      it('should handle mixed content with proper spacing', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer =
          'Before tool call. <tool_call>\n{"name": "test", "parameters": {}}\n</tool_call> After tool call.';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Before tool call.  After tool call.');
        expect(result.toolCalls).toHaveLength(1);
        expect(result.finishReason).toBe('tool_calls');
      });
    });
  });
});
