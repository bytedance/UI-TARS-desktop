/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskStrategy, TaskExecutionResult, StrategyConfig } from '../types';
import { AgentTARS, AgentTARSOptions, LogLevel } from '@agent-tars/core';

/**
 * GUI strategy for benchmarking
 * Tests GUI agent capabilities with browser automation
 */
export class GUIStrategy implements TaskStrategy {
  readonly name = 'GUI';
  readonly description = 'GUI agent with browser automation capabilities';
  readonly taskType = 'gui' as const;

  async createAgent(config: StrategyConfig): Promise<any> {
    const option: AgentTARSOptions = {
      model: {
        provider: 'volcengine',
        id: config.modelId || 'ep-20250613182556-7z8pl',
        apiKey: process.env.ARK_API_KEY,
        useResponseApi: config.useResponseApi,
      },
      toolCallEngine: 'structured_outputs',
      thinking: {
        type: config.thinking || 'disabled',
      },
      logLevel: LogLevel.INFO,
      browser: {
        control: 'visual-grounding',
      },
    };

    // Add dumpMessageHistory if specified
    if (config.dumpMessageHistory !== undefined) {
      option.experimental = {
        dumpMessageHistory: config.dumpMessageHistory,
      };
    }

    console.log('agent option: ', option);

    const agent = new AgentTARS(option);

    return agent;
  }

  async executeTask(agent: any): Promise<TaskExecutionResult> {
    try {
      await agent.initialize();

      const answer = await agent.run({
        input: [
          {
            type: 'text',
            // text: 'please book me the earliest flight from beijing to shanghai',
            text: 'Open https://2captcha.com/demo/normal and pass it',
          },
        ],
        stream: false,
      });

      return {
        success: true,
        result: answer,
        metadata: {
          taskType: 'gui',
          toolsUsed: ['browser_action_tool'],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          taskType: 'gui',
        },
      };
    }
  }

  async cleanup(agent: any): Promise<void> {
    try {
      if (agent && typeof agent.cleanup === 'function') {
        await agent.cleanup();
      }
    } catch (error) {
      console.warn('GUI cleanup error:', error);
    }
  }
}
