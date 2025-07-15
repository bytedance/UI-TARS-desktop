/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Tool,
  z,
  ChatCompletionChunk,
  ToolCallEnginePrepareRequestContext,
  AgentEventStream,
  MultimodalToolCallResult,
  PromptEngineeringToolCallEngine,
  StreamingToolCallUpdate,
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

describe('PromptEngineeringToolCallEngine', () => {
  let engine: PromptEngineeringToolCallEngine;
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

        <tool_instruction>
          1. You have access to the following tools:

          <available_tools>
          ## testTool

        Description: A test tool

        Parameters JSON Schema:
        \`\`\`json
        {"type":"object","properties":{"param":{"type":"string","description":"A test parameter"},"optionalParam":{"type":"number","description":"An optional parameter"}},"required":["param"]}
        \`\`\`


          </available_tools>

          2. To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string matches the Parameters JSON Schema:

          <tool_call>
          {
            "name": "tool_name",
            "parameters": {
              "param1": "value1",
              "param2": "value2"
            }
          }
          </tool_call>

          3. If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.
          4. WARNING:
            4.1. You can always ONLY call tools mentioned in <available_tools>
            4.2. After outputting </tool_call>, you MUST STOP immediately and wait for the tool result in the next agent loop. DO NOT generate any additional text.
            4.3. When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
        </tool_instruction>
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

        <tool_instruction>
          1. You have access to the following tools:

          <available_tools>
          ## tool1

        Description: First tool

        Parameters JSON Schema:
        \`\`\`json
        {"type":"object","properties":{"param1":{"type":"string","description":"First parameter"}},"required":["param1"]}
        \`\`\`



        ## tool2

        Description: Second tool

        Parameters JSON Schema:
        \`\`\`json
        {"type":"object","properties":{"param2":{"type":"boolean","description":"Second parameter"}},"required":["param2"]}
        \`\`\`


          </available_tools>

          2. To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string matches the Parameters JSON Schema:

          <tool_call>
          {
            "name": "tool_name",
            "parameters": {
              "param1": "value1",
              "param2": "value2"
            }
          }
          </tool_call>

          3. If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.
          4. WARNING:
            4.1. You can always ONLY call tools mentioned in <available_tools>
            4.2. After outputting </tool_call>, you MUST STOP immediately and wait for the tool result in the next agent loop. DO NOT generate any additional text.
            4.3. When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
        </tool_instruction>
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

        <tool_instruction>
          1. You have access to the following tools:

          <available_tools>
          ## jsonTool

        Description: JSON schema tool

        Parameters JSON Schema:
        \`\`\`json
        {"type":"object","properties":{"name":{"type":"string","description":"User name"},"age":{"type":"number","description":"User age"}},"required":["name"]}
        \`\`\`


          </available_tools>

          2. To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string matches the Parameters JSON Schema:

          <tool_call>
          {
            "name": "tool_name",
            "parameters": {
              "param1": "value1",
              "param2": "value2"
            }
          }
          </tool_call>

          3. If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.
          4. WARNING:
            4.1. You can always ONLY call tools mentioned in <available_tools>
            4.2. After outputting </tool_call>, you MUST STOP immediately and wait for the tool result in the next agent loop. DO NOT generate any additional text.
            4.3. When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
        </tool_instruction>
        "
      `);
    });
  });

  describe('prepareRequest', () => {
    it('should prepare request without modifying original context', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result).toEqual({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        stream: false,
        stop: ['</tool_call>', '</tool_call>\n\n'],
        stop_sequences: ['</tool_call>', '</tool_call>\n\n'],
      });
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

      const context: ToolCallEnginePrepareRequestContext = {
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [testTool],
        temperature: 0.5,
      };

      const result = engine.prepareRequest(context);

      expect(result).toEqual({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        stream: false,
        stop: ['</tool_call>', '</tool_call>\n\n'],
        stop_sequences: ['</tool_call>', '</tool_call>\n\n'],
      });
    });
  });

  describe('streaming processing with state machine', () => {
    describe('initStreamProcessingState', () => {
      it('should initialize extended streaming state', () => {
        const state = engine.initStreamProcessingState();

        expect(state).toEqual({
          contentBuffer: '',
          toolCalls: [],
          reasoningBuffer: '',
          finishReason: null,
          currentToolCallBuffer: '',
          hasActiveToolCall: false,
          normalContentBuffer: '',
          parserState: 'normal',
          partialTagBuffer: '',
          currentToolCallId: '',
          currentToolName: '',
          emittingParameters: false,
          toolNameExtracted: false,
          parameterBracketDepth: 0,
          parameterContentStarted: false,
        });
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
        expect(state.normalContentBuffer).toBe('Hello world');
        expect(state.parserState).toBe('normal');
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
        const toolCallUpdates: StreamingToolCallUpdate[] = [];

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
        const toolCallUpdates: StreamingToolCallUpdate[] = [];

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

      it('should handle content mixed with tool calls and preserve spacing', () => {
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

      it('should handle false positive tool call tags', () => {
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
        const toolCallUpdates: StreamingToolCallUpdate[] = [];

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

      it('should handle partial opening tag correctly', () => {
        const state = engine.initStreamProcessingState();

        // Test partial tag detection
        const chunks = [
          '<',
          'to',
          'ol',
          '_',
          'ca',
          'll',
          '>',
          '\n{"name": "test"}',
          '\n</',
          'tool',
          '_call',
          '>',
        ];

        let accumulatedContent = '';
        let hasToolCallUpdate = false;

        for (const chunkContent of chunks) {
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
          accumulatedContent += result.content;

          if (result.hasToolCallUpdate) {
            hasToolCallUpdate = true;
          }
        }

        // Should not emit any normal content for valid tool call
        expect(accumulatedContent).toBe('');
        expect(hasToolCallUpdate).toBe(true);
        expect(state.toolCalls).toHaveLength(1);
        expect(state.toolCalls[0].function.name).toBe('test');
      });

      it('should handle mixed partial tags and normal content', () => {
        const state = engine.initStreamProcessingState();

        // Content with false start that becomes normal content
        const chunks = ['Hello ', '<', 'no', 't_', 'a_', 'tag', '>', ' world'];

        let accumulatedContent = '';

        for (const chunkContent of chunks) {
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
          accumulatedContent += result.content;
        }

        expect(accumulatedContent).toBe('Hello <not_a_tag> world');
        expect(state.toolCalls).toHaveLength(0);
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
      it('should finalize with tool calls extracted during streaming', () => {
        const state = engine.initStreamProcessingState();
        state.normalContentBuffer = 'Text before tool call';
        state.toolCalls = [
          {
            id: 'call_123',
            type: 'function',
            function: { name: 'testTool', arguments: '{}' },
          },
        ];
        state.reasoningBuffer = 'Some reasoning';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Text before tool call');
        expect(result.reasoningContent).toBe('Some reasoning');
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('testTool');
        expect(result.finishReason).toBe('tool_calls');
      });

      it('should finalize with content only when no tool calls', () => {
        const state = engine.initStreamProcessingState();
        state.normalContentBuffer = 'Just regular text response';
        state.finishReason = 'stop';

        const result = engine.finalizeStreamProcessing(state);

        expect(result.content).toBe('Just regular text response');
        expect(result.toolCalls).toBeUndefined();
        expect(result.finishReason).toBe('stop');
      });

      it('should only fallback to extraction if no streaming tool calls were found', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer = 'Text <tool_call>\n{"name": "test", "parameters": {}}\n</tool_call>';
        state.normalContentBuffer = '';

        // No tool calls were extracted during streaming
        expect(state.toolCalls).toHaveLength(0);

        const result = engine.finalizeStreamProcessing(state);

        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('test');
        expect(result.finishReason).toBe('tool_calls');
      });

      it('should not duplicate tool calls if already extracted during streaming', () => {
        const state = engine.initStreamProcessingState();
        state.contentBuffer = 'Text <tool_call>\n{"name": "test", "parameters": {}}\n</tool_call>';
        state.normalContentBuffer = 'Text';

        // Tool call was already extracted during streaming
        state.toolCalls = [
          {
            id: 'call_123',
            type: 'function',
            function: { name: 'test', arguments: '{}' },
          },
        ];

        const result = engine.finalizeStreamProcessing(state);

        // Should not duplicate - only one tool call
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls?.[0].function.name).toBe('test');
        expect(result.content).toBe('Text');
      });
    });
  });

  describe('buildHistoricalAssistantMessage', () => {
    it('should build a message without tool calls', () => {
      const response = createMockAssistantMessageEvent({
        content: 'This is a test response',
        rawContent: 'This is a test response',
        finishReason: 'stop',
      });

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result).toEqual({
        role: 'assistant',
        content: 'This is a test response',
      });
    });

    it('should build a message with tool calls embedded in content', () => {
      const toolCalls = [createMockToolCall('testTool', { param: 'value' }, 'call_123')];
      const response = createMockAssistantMessageEventWithToolCalls(toolCalls, {
        content: `I'll help you with that`,
        rawContent: `I'll help you with that.

<tool_call>
{
  "name": "testTool",
  "parameters": {
    "param": "value"
  }
}
</tool_call>`,
      });

      const result = engine.buildHistoricalAssistantMessage(response);

      // Claude doesn't support tool_calls field, only includes content
      expect(result).toEqual({
        role: 'assistant',
        content: `I'll help you with that.

<tool_call>
{
  "name": "testTool",
  "parameters": {
    "param": "value"
  }
}
</tool_call>`,
      });
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

      expect(result).toEqual([
        {
          role: 'user',
          content: 'Tool: testTool\nResult:\n{"result":"success"}',
        },
      ]);
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

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Tool: screenshotTool\nResult:\n{"description":"A screenshot"}',
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

      expect(result).toEqual([
        {
          role: 'user',
          content: 'Tool: textTool\nResult:\n{"result":"text success"}',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Tool: imageTool\nResult:\n{"description":"An image"}',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,/9j/4AAQ',
              },
            },
          ],
        },
      ]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed JSON in tool calls gracefully', () => {
      const state = engine.initStreamProcessingState();
      const malformedContent = '<tool_call>\n{"name": "testTool", invalid json\n</tool_call>';
      const chunks = malformedContent.split('').map((char) => ({
        choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
      }));

      let hasToolCallUpdate = false;

      for (const chunk of chunks) {
        const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        if (result.hasToolCallUpdate) {
          hasToolCallUpdate = true;
        }
      }

      // Should extract partial information but not create final tool calls due to malformed JSON
      expect(hasToolCallUpdate).toBe(true);
      expect(state.toolCalls).toHaveLength(0); // Still no complete tool calls due to malformed JSON
    });

    it('should handle nested angle brackets in normal content', () => {
      const state = engine.initStreamProcessingState();

      const contentWithBrackets = 'The result is <div>content</div> and more text.';

      const chunks = contentWithBrackets.split('').map((char) => ({
        choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
      }));

      let accumulatedContent = '';

      for (const chunk of chunks) {
        const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        accumulatedContent += result.content;
      }

      expect(accumulatedContent).toBe(contentWithBrackets);
      expect(state.toolCalls).toHaveLength(0);
    });

    it('should handle multiple tool calls in sequence', () => {
      const state = engine.initStreamProcessingState();

      const multipleToolCalls =
        'First: <tool_call>\n{"name": "tool1", "parameters": {}}\n</tool_call> Second: <tool_call>\n{"name": "tool2", "parameters": {"x": 1}}\n</tool_call>';

      const chunks = multipleToolCalls.split('').map((char) => ({
        choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
      }));

      let accumulatedContent = '';
      let toolCallUpdateCount = 0;

      for (const chunk of chunks) {
        const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        accumulatedContent += result.content;

        if (result.hasToolCallUpdate) {
          toolCallUpdateCount += result.streamingToolCallUpdates?.length || 0;
        }
      }

      expect(accumulatedContent).toBe('First:  Second: ');
      expect(state.toolCalls).toHaveLength(2);
      expect(state.toolCalls[0].function.name).toBe('tool1');
      expect(state.toolCalls[1].function.name).toBe('tool2');
      expect(toolCallUpdateCount).toBe(14);
    });
  });
});
