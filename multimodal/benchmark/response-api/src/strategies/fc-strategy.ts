/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskStrategy, TaskExecutionResult, StrategyConfig } from '../types';
import { AgentOptions } from '@multimodal/agent';

/**
 * Function Calling strategy for benchmarking
 * Tests basic tool calling capabilities with weather and location tools
 */
export class FCStrategy implements TaskStrategy {
  readonly name = 'FunctionCalling';
  readonly description = 'Basic function calling with weather and location tools';
  readonly taskType = 'fc' as const;

  async createAgent(config: StrategyConfig): Promise<any> {
    // Import dynamically to avoid module resolution issues during build
    const { Agent, LogLevel, Tool, z } = await import('@multimodal/agent');

    const locationTool = new Tool({
      id: 'getCurrentLocation',
      description: "Get user's current location",
      parameters: z.object({}),
      function: async () => {
        return { location: 'Boston' };
      },
    });

    const weatherTool = new Tool({
      id: 'getWeather',
      description: 'Get weather information for a specified location',
      parameters: z.object({
        location: z.string().describe('Location name, such as city name'),
      }),
      function: async (input) => {
        const { location } = input;
        return {
          location,
          temperature: '70°F (21°C)',
          condition: 'Sunny',
          precipitation: '10%',
          humidity: '45%',
          wind: '5 mph',
        };
      },
    });

    const agentConfig: AgentOptions = {
      model: {
        provider: 'volcengine',
        id: config.modelId || 'ep-20250613182556-7z8pl', // Use provided modelId or default doubao-1.6
        apiKey: process.env.ARK_API_KEY,
        useResponseApi: config.useResponseApi,
      },
      thinking: {
        type: config.thinking || 'disabled',
      },
      tools: [locationTool, weatherTool],
      logLevel: LogLevel.ERROR, // Reduce noise during benchmarking
    };

    console.log('agentConfig: ', agentConfig);

    return new Agent(agentConfig);
  }

  async executeTask(agent: any): Promise<TaskExecutionResult> {
    try {
      const answer = await agent.run({
        input: "How's the weather today?",
        stream: false,
      });

      return {
        success: true,
        result: answer,
        metadata: {
          taskType: 'function_calling',
          toolsUsed: ['getCurrentLocation', 'getWeather'],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          taskType: 'function_calling',
        },
      };
    }
  }

  async cleanup(agent: any): Promise<void> {
    // No specific cleanup needed for FC strategy
  }
}
