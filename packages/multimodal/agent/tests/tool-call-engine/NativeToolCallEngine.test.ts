/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Tool,
  z,
  getLogger,
  ToolDefinition,
  NativeToolCallEngine,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
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
      const tools: ToolDefinition[] = [];

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
      const context: PrepareRequestContext = {
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

      const context: PrepareRequestContext = {
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

      const context: PrepareRequestContext = {
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
        }
      `);
    });

    it('should handle empty tools array by setting tools to undefined', () => {
      const context: PrepareRequestContext = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result.tools).toBeUndefined();
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

    it('should build a message with tool calls', () => {
      const response: AgentSingleLoopReponse = {
        content: 'I will help you with that',
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
});
