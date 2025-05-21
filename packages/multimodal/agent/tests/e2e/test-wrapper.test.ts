import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent, Tool } from '../../src';
import { TestWrapper } from '../../test-runner-2';
import { z } from 'zod';
import path from 'path';
import { EventType } from '@multimodal/agent-interface';

describe('TestWrapper', () => {
  let agent: Agent;
  let testWrapper: TestWrapper;

  beforeEach(() => {
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

    // 创建测试包装器
    testWrapper = TestWrapper.create(agent, {
      envPath: path.resolve(__dirname, '../../fixtures/tool_calls_basic'),
      testName: 'basic_weather_test',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run agent and analyze results', async () => {
    // 运行测试
    await testWrapper.run({
      input: "How's the weather today?",
    });

    // 获取结果
    const result = testWrapper.getLastResult();
    expect(result).toBeDefined();

    // 验证元数据
    expect(result?.meta.testName).toBe('basic_weather_test');
    expect(result?.meta.loopCount).toBe(3);

    // 验证事件流
    const events = testWrapper.getEvents();
    expect(events.length).toBeGreaterThan(0);

    // 验证特定类型的事件
    const toolCallEvents = testWrapper.getEventsByType(EventType.TOOL_CALL);
    expect(toolCallEvents.length).toBe(2);

    const toolResultEvents = testWrapper.getEventsByType(EventType.TOOL_RESULT);
    expect(toolResultEvents.length).toBe(2);

    const assistantMessages = testWrapper.getEventsByType(EventType.ASSISTANT_MESSAGE);
    expect(assistantMessages.length).toBeGreaterThan(0);
  });
});
