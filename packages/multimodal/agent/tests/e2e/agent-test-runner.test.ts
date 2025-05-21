import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent, Tool } from '../../src';
import { AgentTestRunner } from '../../test-runner-2';
import { z } from 'zod';
import path from 'path';

describe('AgentTestRunner', () => {
  let agent: Agent;

  beforeEach(() => {
    // 重置环境变量
    vi.resetModules();

    // 创建测试 Agent 实例
    agent = new Agent({
      instructions: 'You are a helpful assistant that can use provided tools.',
      maxIterations: 3,
    });

    // 注册测试工具
    agent.registerTool(
      new Tool({
        id: 'getCurrentLocation',
        description: "Get user's current location",
        parameters: z.object({}),
        function: async () => ({ location: 'Boston' }),
      }),
    );

    agent.registerTool(
      new Tool({
        id: 'getWeather',
        description: 'Get weather information for a specified location',
        parameters: z.object({
          location: z.string().describe('Location name, such as city name'),
        }),
        function: async (args) => ({
          location: args.location,
          temperature: '70°F (21°C)',
          condition: 'Sunny',
          precipitation: '10%',
          humidity: '45%',
          wind: '5 mph',
        }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully run agent with test fixtures', async () => {
    // 创建测试运行器
    const testRunner = AgentTestRunner.wrap(agent, {
      envPath: path.resolve(__dirname, '../../fixtures/tool_calls_basic'),
    });

    // 运行测试
    const result = await testRunner.run({
      input: "How's the weather today?",
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "events": [
          {
            "content": "How's the weather today?",
            "id": "2019b250-e1c9-4cc0-9184-efacc95b2a25",
            "timestamp": 1747820811942,
            "type": "user_message",
          },
          {
            "content": "To get the weather, I need the user's current location. First, call getCurrentLocation to obtain the location, then use that location to call getWeather.",
            "finishReason": "tool_calls",
            "id": "e7bfa613-06c1-48a4-b71a-752186d26d2e",
            "timestamp": 1747820811945,
            "toolCalls": [
              {
                "function": {
                  "arguments": "{}",
                  "name": "getCurrentLocation",
                },
                "id": "call_lv8lc6ruv1hti1v2w68y0shk",
                "type": "function",
              },
            ],
            "type": "assistant_message",
          },
          {
            "arguments": {},
            "id": "c3337cdd-41db-45c3-93a9-d5a0f914f1a0",
            "name": "getCurrentLocation",
            "startTime": 1747820811945,
            "timestamp": 1747820811946,
            "tool": {
              "description": "Get user's current location",
              "name": "getCurrentLocation",
              "schema": {
                "properties": {},
                "type": "object",
              },
            },
            "toolCallId": "call_lv8lc6ruv1hti1v2w68y0shk",
            "type": "tool_call",
          },
          {
            "content": {
              "location": "Boston",
            },
            "elapsedMs": 0,
            "error": undefined,
            "id": "17342a4d-028c-4c94-8117-5e7b4f464d77",
            "name": "getCurrentLocation",
            "timestamp": 1747820811946,
            "toolCallId": "call_lv8lc6ruv1hti1v2w68y0shk",
            "type": "tool_result",
          },
          {
            "content": "Now that we have the location "Boston" from getCurrentLocation, we can call getWeather with this location to get the weather information.",
            "finishReason": "tool_calls",
            "id": "cae9314a-24de-48c8-9bd9-812a0ed14615",
            "timestamp": 1747820811946,
            "toolCalls": [
              {
                "function": {
                  "arguments": "{"location":"Boston"}",
                  "name": "getWeather",
                },
                "id": "call_0zad7crx327ox9ldw0s5gyd3",
                "type": "function",
              },
            ],
            "type": "assistant_message",
          },
          {
            "arguments": {
              "location": "Boston",
            },
            "id": "3fe28920-8509-45a8-b9a3-ec9b167d0238",
            "name": "getWeather",
            "startTime": 1747820811946,
            "timestamp": 1747820811947,
            "tool": {
              "description": "Get weather information for a specified location",
              "name": "getWeather",
              "schema": {
                "properties": {
                  "location": {
                    "description": "Location name, such as city name",
                    "type": "string",
                  },
                },
                "required": [
                  "location",
                ],
                "type": "object",
              },
            },
            "toolCallId": "call_0zad7crx327ox9ldw0s5gyd3",
            "type": "tool_call",
          },
          {
            "content": {
              "condition": "Sunny",
              "humidity": "45%",
              "location": "Boston",
              "precipitation": "10%",
              "temperature": "70°F (21°C)",
              "wind": "5 mph",
            },
            "elapsedMs": 0,
            "error": undefined,
            "id": "d158852a-9859-425a-b9a8-637a6581a574",
            "name": "getWeather",
            "timestamp": 1747820811947,
            "toolCallId": "call_0zad7crx327ox9ldw0s5gyd3",
            "type": "tool_result",
          },
          {
            "content": "The weather information for Boston has been retrieved. We can now summarize it to answer the user's question.
      In Boston today, the weather is sunny with a temperature of 70°F (21°C). The precipitation chance is 10%, humidity is 45%, and wind speed is 5 mph.</think>In Boston today, the weather is sunny with a temperature of 70°F (21°C). The precipitation chance is 10%, humidity is 45%, and wind speed is 5 mph.",
            "finishReason": "stop",
            "id": "ebd5e421-a992-4c12-8a87-0ea1642fc0cb",
            "timestamp": 1747820811947,
            "toolCalls": undefined,
            "type": "assistant_message",
          },
        ],
        "meta": {
          "executionTime": 6,
          "loopCount": 3,
          "testName": "agent_test",
        },
        "response": {
          "content": "The weather information for Boston has been retrieved. We can now summarize it to answer the user's question.
      In Boston today, the weather is sunny with a temperature of 70°F (21°C). The precipitation chance is 10%, humidity is 45%, and wind speed is 5 mph.</think>In Boston today, the weather is sunny with a temperature of 70°F (21°C). The precipitation chance is 10%, humidity is 45%, and wind speed is 5 mph.",
          "finishReason": "stop",
          "id": "ebd5e421-a992-4c12-8a87-0ea1642fc0cb",
          "timestamp": 1747820811947,
          "toolCalls": undefined,
          "type": "assistant_message",
        },
      }
    `);

    // 验证结果
    expect(result).toBeDefined();
  });
});
