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
  PromptEngineeringToolCallEngine,
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
});
