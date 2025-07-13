/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  Tool,
  MessageHistory,
  NativeToolCallEngine,
  PromptEngineeringToolCallEngine,
} from './../../src';
import { AgentEventStream } from 'agent-interface/src';
import { AgentEventStreamProcessor } from '../../src/agent/event-stream';

import { AgentSnapshotNormalizer } from '../../../agent-snapshot/src';
const normalizer = new AgentSnapshotNormalizer({});
expect.addSnapshotSerializer(normalizer.createSnapshotSerializer());

function loadEventStream(loopNumber: number): AgentEventStream.Event[] {
  const filePath = path.resolve(
    __dirname,
    `../../snapshot/tool-calls/basic/loop-${loopNumber}/event-stream.jsonl`,
  );
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

describe('MessageHistory', () => {
  let eventStream: AgentEventStreamProcessor;
  let messageHistory: MessageHistory;
  let nativeEngine: NativeToolCallEngine;
  let promptEngine: PromptEngineeringToolCallEngine;
  const defaultSystemPrompt = 'You are a helpful assistant that can use provided tools.';

  beforeEach(() => {
    eventStream = new AgentEventStreamProcessor();
    messageHistory = new MessageHistory(eventStream);
    nativeEngine = new NativeToolCallEngine();
    promptEngine = new PromptEngineeringToolCallEngine();
  });

  describe('Empty event stream', () => {
    it('should handle empty event stream', () => {
      // Test with no events added

      // Test NativeEngine
      const nativeMessages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);
      expect(nativeMessages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          }
        ]
      `);

      // Test PromptEngineering Engine
      const promptMessages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);
      expect(promptMessages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          }
        ]
      `);
    });
  });

  describe('Multiple user messages', () => {
    it('should handle multiple user messages correctly', () => {
      // Create event stream with multiple user messages
      const multiUserEvents: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: 1747472647787,
          content: 'Hello',
        },
        {
          id: 'assistant-1',
          type: 'assistant_message',
          timestamp: 1747472651524,
          content: 'Hi there! How can I help you?',
          finishReason: 'stop',
        },
        {
          id: 'user-2',
          type: 'user_message',
          timestamp: 1747472660000,
          content: "What's the weather today?",
        },
      ];

      // Add events to event stream
      multiUserEvents.forEach((event) => eventStream.sendEvent(event));

      // Test results
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "Hello"
          },
          {
            "role": "assistant",
            "content": "Hi there! How can I help you?"
          },
          {
            "role": "user",
            "content": "What's the weather today?"
          }
        ]
      `);
    });
  });

  describe('NativeToolCallEngine', () => {
    it('should convert loop-1 events (initial user message) correctly', () => {
      // Load loop-1 events and simulate event stream
      const events = loadEventStream(1);
      events.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "How's the weather today?"
          }
        ]
      `);
    });

    it('should convert loop-2 events (user + assistant + tool call + result) correctly', () => {
      // Load loop-2 events and simulate event stream
      const events = loadEventStream(2);
      events.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "How's the weather today?"
          },
          {
            "role": "assistant",
            "content": "To get the weather, I first need your current location. Retrieving your location...",
            "tool_calls": [
              {
                "id": "<<ID>>",
                "type": "function",
                "function": {
                  "name": "getCurrentLocation",
                  "arguments": "{}"
                }
              }
            ]
          },
          {
            "role": "tool",
            "tool_call_id": "<<ID>>",
            "content": "{\\n  \\"location\\": \\"Boston\\"\\n}"
          }
        ]
      `);
    });

    it('should convert loop-3 events (multiple tool calls) correctly', () => {
      // Load loop-3 events and simulate event stream
      const events = loadEventStream(3);
      events.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "How's the weather today?"
          },
          {
            "role": "assistant",
            "content": "To get the weather, I first need your current location. Retrieving your location...",
            "tool_calls": [
              {
                "id": "<<ID>>",
                "type": "function",
                "function": {
                  "name": "getCurrentLocation",
                  "arguments": "{}"
                }
              }
            ]
          },
          {
            "role": "tool",
            "tool_call_id": "<<ID>>",
            "content": "{\\n  \\"location\\": \\"Boston\\"\\n}"
          },
          {
            "role": "assistant",
            "content": "Fetching weather for Boston...",
            "tool_calls": [
              {
                "id": "<<ID>>",
                "type": "function",
                "function": {
                  "name": "getWeather",
                  "arguments": "{\\"location\\":\\"Boston\\"}"
                }
              }
            ]
          },
          {
            "role": "tool",
            "tool_call_id": "<<ID>>",
            "content": "{\\n  \\"location\\": \\"Boston\\",\\n  \\"temperature\\": \\"70°F (21°C)\\",\\n  \\"condition\\": \\"Sunny\\",\\n  \\"precipitation\\": \\"10%\\",\\n  \\"humidity\\": \\"45%\\",\\n  \\"wind\\": \\"5 mph\\"\\n}"
          }
        ]
      `);
    });

    it('should handle mixed multimodal content in tool results', () => {
      // Create a custom event stream with multimodal content
      const customEvents: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: 1747472647787,
          content: 'Show me a screenshot of the weather',
        },
        {
          id: 'assistant-1',
          type: 'assistant_message',
          timestamp: 1747472651524,
          content: "I'll get a screenshot of the weather for you.",
          toolCalls: [
            {
              id: 'call-screenshot',
              type: 'function',
              function: {
                name: 'getWeatherScreenshot',
                arguments: '{}',
              },
            },
          ],
          finishReason: 'tool_calls',
        },
        {
          id: 'tool-call-1',
          type: 'tool_call',
          timestamp: 1747472651525,
          toolCallId: 'call-screenshot',
          name: 'getWeatherScreenshot',
          arguments: {},
          startTime: 1747472651525,
          tool: {
            name: 'getWeatherScreenshot',
            description: 'Get a screenshot of the weather',
            schema: {
              type: 'object',
              properties: {},
            },
          },
        },
        {
          id: 'tool-result-1',
          type: 'tool_result',
          timestamp: 1747472651525,
          toolCallId: 'call-screenshot',
          name: 'getWeatherScreenshot',
          content: {
            type: 'image',
            data: 'base64imagedata', // Assuming this is a base64 encoded image
            mimeType: 'image/png',
            description: 'Current weather forecast',
          },
          elapsedMs: 0,
        },
      ];

      // Add custom events to the event stream
      customEvents.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "Show me a screenshot of the weather"
          },
          {
            "role": "assistant",
            "content": "I'll get a screenshot of the weather for you.",
            "tool_calls": [
              {
                "id": "<<ID>>",
                "type": "function",
                "function": {
                  "name": "getWeatherScreenshot",
                  "arguments": "{}"
                }
              }
            ]
          },
          {
            "role": "tool",
            "tool_call_id": "<<ID>>",
            "content": "{\\n  \\"description\\": \\"Current weather forecast\\"\\n}"
          },
          {
            "role": "user",
            "content": [
              {
                "type": "image_url",
                "image_url": "<<image_url>>"
              }
            ]
          }
        ]
      `);
    });
  });

  describe('PromptEngineeringToolCallEngine', () => {
    it('should convert loop-1 events (initial user message) correctly', () => {
      // Load loop-1 events and simulate event stream
      const events = loadEventStream(1);
      events.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "How's the weather today?"
          }
        ]
      `);
    });

    it('should convert loop-2 events (user + assistant + tool call + result) correctly', () => {
      // Load loop-2 events and simulate event stream
      const events = loadEventStream(2);
      events.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "How's the weather today?"
          },
          {
            "role": "assistant",
            "content": "To get the weather, I first need your current location. Retrieving your location..."
          },
          {
            "role": "user",
            "content": "Tool: getCurrentLocation\\nResult:\\n{\\n  \\"location\\": \\"Boston\\"\\n}"
          }
        ]
      `);
    });

    it('should convert loop-3 events (multiple tool calls) correctly', () => {
      // Load loop-3 events and simulate event stream
      const events = loadEventStream(3);
      events.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "How's the weather today?"
          },
          {
            "role": "assistant",
            "content": "To get the weather, I first need your current location. Retrieving your location..."
          },
          {
            "role": "user",
            "content": "Tool: getCurrentLocation\\nResult:\\n{\\n  \\"location\\": \\"Boston\\"\\n}"
          },
          {
            "role": "assistant",
            "content": "Fetching weather for Boston..."
          },
          {
            "role": "user",
            "content": "Tool: getWeather\\nResult:\\n{\\n  \\"location\\": \\"Boston\\",\\n  \\"temperature\\": \\"70°F (21°C)\\",\\n  \\"condition\\": \\"Sunny\\",\\n  \\"precipitation\\": \\"10%\\",\\n  \\"humidity\\": \\"45%\\",\\n  \\"wind\\": \\"5 mph\\"\\n}"
          }
        ]
      `);
    });
  });

  describe('toMessageHistory with custom event streams', () => {
    it('should handle mixed multimodal content in tool results with Native engine', () => {
      // Create a custom event stream with multimodal content
      const customEvents: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: 1747472647787,
          content: 'Show me a screenshot of the weather',
        },
        {
          id: 'assistant-1',
          type: 'assistant_message',
          timestamp: 1747472651524,
          content: "I'll get a screenshot of the weather for you.",
          toolCalls: [
            {
              id: 'call-screenshot',
              type: 'function',
              function: {
                name: 'getWeatherScreenshot',
                arguments: '{}',
              },
            },
          ],
          finishReason: 'tool_calls',
        },
        {
          id: 'tool-call-1',
          type: 'tool_call',
          timestamp: 1747472651525,
          toolCallId: 'call-screenshot',
          name: 'getWeatherScreenshot',
          arguments: {},
          startTime: 1747472651525,
          tool: {
            name: 'getWeatherScreenshot',
            description: 'Get a screenshot of the weather',
            schema: {
              type: 'object',
              properties: {},
            },
          },
        },
        {
          id: 'tool-result-1',
          type: 'tool_result',
          timestamp: 1747472651525,
          toolCallId: 'call-screenshot',
          name: 'getWeatherScreenshot',
          content: {
            type: 'image',

            data: 'base64imagedata', // Assuming this is a base64 encoded image
            mimeType: 'image/png',
            description: 'Current weather forecast',
          },
          elapsedMs: 0,
        },
      ];

      // Add custom events to the event stream
      customEvents.forEach((event) => eventStream.sendEvent(event));

      // Get message history
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);

      // Test results
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "Show me a screenshot of the weather"
          },
          {
            "role": "assistant",
            "content": "I'll get a screenshot of the weather for you.",
            "tool_calls": [
              {
                "id": "<<ID>>",
                "type": "function",
                "function": {
                  "name": "getWeatherScreenshot",
                  "arguments": "{}"
                }
              }
            ]
          },
          {
            "role": "tool",
            "tool_call_id": "<<ID>>",
            "content": "{\\n  \\"description\\": \\"Current weather forecast\\"\\n}"
          },
          {
            "role": "user",
            "content": [
              {
                "type": "image_url",
                "image_url": "<<image_url>>"
              }
            ]
          }
        ]
      `);
    });

    it('should handle empty event stream', () => {
      // No events added

      // Test Native Engine
      const nativeMessages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);
      expect(nativeMessages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          }
        ]
      `);

      // Test PromptEngineering Engine
      const promptMessages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);
      expect(promptMessages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          }
        ]
      `);
    });

    it('should handle multiple user messages correctly', () => {
      // Create event stream with multiple user messages
      const multiUserEvents: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: 1747472647787,
          content: 'Hello',
        },
        {
          id: 'assistant-1',
          type: 'assistant_message',
          timestamp: 1747472651524,
          content: 'Hi there! How can I help you?',
          finishReason: 'stop',
        },
        {
          id: 'user-2',
          type: 'user_message',
          timestamp: 1747472660000,
          content: "What's the weather today?",
        },
      ];

      // Add events to event stream
      multiUserEvents.forEach((event) => eventStream.sendEvent(event));

      // Test results
      const messages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);
      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You are a helpful assistant that can use provided tools.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          },
          {
            "role": "user",
            "content": "Hello"
          },
          {
            "role": "assistant",
            "content": "Hi there! How can I help you?"
          },
          {
            "role": "user",
            "content": "What's the weather today?"
          }
        ]
      `);
    });
  });

  describe('System prompt customization', () => {
    it('should use custom system prompt', () => {
      const customPrompt = 'You are an AI that specializes in weather forecasting.';
      const messages = messageHistory.toMessageHistory(nativeEngine, customPrompt);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: 'system',
        content: expect.stringContaining('You are an AI that specializes in weather forecasting.'),
      });
    });

    it('should properly merge tools with system prompt', () => {
      const customPrompt = 'You can use tools to help users.';
      const mockTool = new Tool({
        id: 'testTool',
        description: 'A test tool',
        parameters: { type: 'object', properties: {} },
        function: async () => 'test result',
      });

      // This here we test NativeToolCallEngine how to handle tools
      const messages = messageHistory.toMessageHistory(nativeEngine, customPrompt, [mockTool]);

      expect(messages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You can use tools to help users.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM"
          }
        ]
      `);

      // Similarly test PromptEngineering engine
      const promptMessages = messageHistory.toMessageHistory(promptEngine, customPrompt, [
        mockTool,
      ]);

      expect(promptMessages).toMatchInlineSnapshot(`
        [
          {
            "role": "system",
            "content": "You can use tools to help users.\\n\\nCurrent time: 5/20/2025, 10:00:00 AM\\n\\n<tool_instruction>\\n  1. You have access to the following tools:\\n\\n  <available_tools>\\n  ## testTool\\n\\nDescription: A test tool\\n\\nParameters JSON Schema:\\n\`\`\`json\\n{\\"type\\":\\"object\\",\\"properties\\":{}}\\n\`\`\`\\n\\n\\n  </available_tools>\\n\\n  2. To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string matches the Parameters JSON Schema:\\n\\n  <tool_call>\\n  {\\n    \\"name\\": \\"tool_name\\",\\n    \\"parameters\\": {\\n      \\"param1\\": \\"value1\\",\\n      \\"param2\\": \\"value2\\"\\n    }\\n  }\\n  </tool_call>\\n\\n  3. If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.\\n  4. WARNING:\\n    4.1. You can always ONLY call tools mentioned in <available_tools>\\n    4.2. After outputting </tool_call>, you MUST STOP immediately and wait for the tool result in the next agent loop. DO NOT generate any additional text.\\n    4.3. When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.\\n</tool_instruction>\\n"
          }
        ]
      `);
    });
  });

  describe('Context options', () => {
    function loadFixture(name: string): AgentEventStream.Event[] {
      const filePath = path.resolve(__dirname, '__fixtures__', name);
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }

    describe('limit image count', () => {
      it('nativeEngine', () => {
        messageHistory = new MessageHistory(eventStream, 5);
        const events = loadFixture('event-stream-with-many-images.jsonl');
        events.forEach((event) => eventStream.sendEvent(event));
        const nativeMessages = messageHistory.toMessageHistory(nativeEngine, defaultSystemPrompt);
        expect(nativeMessages).toMatchSnapshot();
      });
    });

    describe('limit image count', () => {
      it('nativeEngine', () => {
        messageHistory = new MessageHistory(eventStream, 5);
        const events = loadFixture('event-stream-with-many-images.jsonl');
        events.forEach((event) => eventStream.sendEvent(event));
        const nativeMessages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);
        expect(nativeMessages).toMatchSnapshot();
      });
    });
  });
});
