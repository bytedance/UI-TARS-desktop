import { describe, it, expect, beforeEach } from 'vitest';
import { MessageHistory } from './message-history';
import { EventStream } from '../stream/event-stream';
import { Event, EventType } from '../types';
import { NativeToolCallEngine } from '../tool-call-engine/NativeToolCallEngine';
import { PromptEngineeringToolCallEngine } from '../tool-call-engine/PromptEngineeringToolCallEngine';
import fs from 'fs';
import path from 'path';
import { Tool } from './tool';

function loadEventStream(loopNumber: number): Event[] {
  const filePath = path.resolve(
    __dirname,
    `../../fixtures/tool_calls_basic/loop-${loopNumber}/event-stream.jsonl`,
  );
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

describe('MessageHistory', () => {
  let eventStream: EventStream;
  let messageHistory: MessageHistory;
  let nativeEngine: NativeToolCallEngine;
  let promptEngine: PromptEngineeringToolCallEngine;
  const defaultSystemPrompt = 'You are a helpful assistant that can use provided tools.';

  beforeEach(() => {
    eventStream = new EventStream();
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
        ]
      `);

      // Test PromptEngineering Engine
      const promptMessages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);
      expect(promptMessages).toMatchInlineSnapshot(`
        [
          {
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
        ]
      `);
    });
  });

  describe('Multiple user messages', () => {
    it('should handle multiple user messages correctly', () => {
      // Create event stream with multiple user messages
      const multiUserEvents: Event[] = [
        {
          id: 'user-1',
          type: EventType.USER_MESSAGE,
          timestamp: 1747472647787,
          content: 'Hello',
        },
        {
          id: 'assistant-1',
          type: EventType.ASSISTANT_MESSAGE,
          timestamp: 1747472651524,
          content: 'Hi there! How can I help you?',
          finishReason: 'stop',
        },
        {
          id: 'user-2',
          type: EventType.USER_MESSAGE,
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "Hello",
            "role": "user",
          },
          {
            "content": "Hi there! How can I help you?",
            "role": "assistant",
          },
          {
            "content": "What's the weather today?",
            "role": "user",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "How's the weather today?",
            "role": "user",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "How's the weather today?",
            "role": "user",
          },
          {
            "content": "To get the weather, I need the user's current location. First, call getCurrentLocation to obtain the location, then use that location to call getWeather.",
            "role": "assistant",
            "tool_calls": [
              {
                "function": {
                  "arguments": "{}",
                  "name": "getCurrentLocation",
                },
                "id": "call_lv8lc6ruv1hti1v2w68y0shk",
                "type": "function",
              },
            ],
          },
          {
            "content": "{
          "location": "Boston"
        }",
            "role": "tool",
            "tool_call_id": "call_lv8lc6ruv1hti1v2w68y0shk",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "How's the weather today?",
            "role": "user",
          },
          {
            "content": "To get the weather, I need the user's current location. First, call getCurrentLocation to obtain the location, then use that location to call getWeather.",
            "role": "assistant",
            "tool_calls": [
              {
                "function": {
                  "arguments": "{}",
                  "name": "getCurrentLocation",
                },
                "id": "call_lv8lc6ruv1hti1v2w68y0shk",
                "type": "function",
              },
            ],
          },
          {
            "content": "{
          "location": "Boston"
        }",
            "role": "tool",
            "tool_call_id": "call_lv8lc6ruv1hti1v2w68y0shk",
          },
          {
            "content": "Now that we have the location "Boston" from getCurrentLocation, we can call getWeather with this location to get the weather information.",
            "role": "assistant",
            "tool_calls": [
              {
                "function": {
                  "arguments": "{"location":"Boston"}",
                  "name": "getWeather",
                },
                "id": "call_0zad7crx327ox9ldw0s5gyd3",
                "type": "function",
              },
            ],
          },
          {
            "content": "{
          "location": "Boston",
          "temperature": "70°F (21°C)",
          "condition": "Sunny",
          "precipitation": "10%",
          "humidity": "45%",
          "wind": "5 mph"
        }",
            "role": "tool",
            "tool_call_id": "call_0zad7crx327ox9ldw0s5gyd3",
          },
        ]
      `);
    });

    it('should handle mixed multimodal content in tool results', () => {
      // Create a custom event stream with multimodal content
      const customEvents: Event[] = [
        {
          id: 'user-1',
          type: EventType.USER_MESSAGE,
          timestamp: 1747472647787,
          content: 'Show me a screenshot of the weather',
        },
        {
          id: 'assistant-1',
          type: EventType.ASSISTANT_MESSAGE,
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
          type: EventType.TOOL_CALL,
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
          type: EventType.TOOL_RESULT,
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "Show me a screenshot of the weather",
            "role": "user",
          },
          {
            "content": "I'll get a screenshot of the weather for you.",
            "role": "assistant",
            "tool_calls": [
              {
                "function": {
                  "arguments": "{}",
                  "name": "getWeatherScreenshot",
                },
                "id": "call-screenshot",
                "type": "function",
              },
            ],
          },
          {
            "content": "{
          "description": "Current weather forecast"
        }",
            "role": "tool",
            "tool_call_id": "call-screenshot",
          },
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,base64imagedata",
                },
                "type": "image_url",
              },
              {
                "text": "{
          "description": "Current weather forecast"
        }",
                "type": "text",
              },
            ],
            "role": "user",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "How's the weather today?",
            "role": "user",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "How's the weather today?",
            "role": "user",
          },
          {
            "content": "To get the weather, I need the user's current location. First, call getCurrentLocation to obtain the location, then use that location to call getWeather.",
            "role": "assistant",
          },
          {
            "content": "Tool: getCurrentLocation
        Result:
        {
          "location": "Boston"
        }",
            "role": "user",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "How's the weather today?",
            "role": "user",
          },
          {
            "content": "To get the weather, I need the user's current location. First, call getCurrentLocation to obtain the location, then use that location to call getWeather.",
            "role": "assistant",
          },
          {
            "content": "Tool: getCurrentLocation
        Result:
        {
          "location": "Boston"
        }",
            "role": "user",
          },
          {
            "content": "Now that we have the location "Boston" from getCurrentLocation, we can call getWeather with this location to get the weather information.",
            "role": "assistant",
          },
          {
            "content": "Tool: getWeather
        Result:
        {
          "location": "Boston",
          "temperature": "70°F (21°C)",
          "condition": "Sunny",
          "precipitation": "10%",
          "humidity": "45%",
          "wind": "5 mph"
        }",
            "role": "user",
          },
        ]
      `);
    });
  });

  describe('toMessageHistory with custom event streams', () => {
    it('should handle mixed multimodal content in tool results with Native engine', () => {
      // Create a custom event stream with multimodal content
      const customEvents: Event[] = [
        {
          id: 'user-1',
          type: EventType.USER_MESSAGE,
          timestamp: 1747472647787,
          content: 'Show me a screenshot of the weather',
        },
        {
          id: 'assistant-1',
          type: EventType.ASSISTANT_MESSAGE,
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
          type: EventType.TOOL_CALL,
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
          type: EventType.TOOL_RESULT,
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "Show me a screenshot of the weather",
            "role": "user",
          },
          {
            "content": "I'll get a screenshot of the weather for you.",
            "role": "assistant",
            "tool_calls": [
              {
                "function": {
                  "arguments": "{}",
                  "name": "getWeatherScreenshot",
                },
                "id": "call-screenshot",
                "type": "function",
              },
            ],
          },
          {
            "content": "{
          "description": "Current weather forecast"
        }",
            "role": "tool",
            "tool_call_id": "call-screenshot",
          },
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,base64imagedata",
                },
                "type": "image_url",
              },
              {
                "text": "{
          "description": "Current weather forecast"
        }",
                "type": "text",
              },
            ],
            "role": "user",
          },
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
        ]
      `);

      // Test PromptEngineering Engine
      const promptMessages = messageHistory.toMessageHistory(promptEngine, defaultSystemPrompt);
      expect(promptMessages).toMatchInlineSnapshot(`
        [
          {
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
        ]
      `);
    });

    it('should handle multiple user messages correctly', () => {
      // Create event stream with multiple user messages
      const multiUserEvents: Event[] = [
        {
          id: 'user-1',
          type: EventType.USER_MESSAGE,
          timestamp: 1747472647787,
          content: 'Hello',
        },
        {
          id: 'assistant-1',
          type: EventType.ASSISTANT_MESSAGE,
          timestamp: 1747472651524,
          content: 'Hi there! How can I help you?',
          finishReason: 'stop',
        },
        {
          id: 'user-2',
          type: EventType.USER_MESSAGE,
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
            "content": "You are a helpful assistant that can use provided tools.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
          {
            "content": "Hello",
            "role": "user",
          },
          {
            "content": "Hi there! How can I help you?",
            "role": "assistant",
          },
          {
            "content": "What's the weather today?",
            "role": "user",
          },
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
            "content": "You can use tools to help users.

        Current time: 5/20/2025, 10:00:00 AM",
            "role": "system",
          },
        ]
      `);

      // Similarly test PromptEngineering engine
      const promptMessages = messageHistory.toMessageHistory(promptEngine, customPrompt, [
        mockTool,
      ]);

      expect(promptMessages).toMatchInlineSnapshot(`
        [
          {
            "content": "You can use tools to help users.

        Current time: 5/20/2025, 10:00:00 AM

        You have access to the following tools:

        ## testTool

        Description: A test tool

        Parameters:
        No parameters required

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
        ",
            "role": "system",
          },
        ]
      `);
    });
  });
});
