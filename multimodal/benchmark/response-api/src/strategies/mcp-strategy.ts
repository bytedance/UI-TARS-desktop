/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgentOptions, MCPAgent } from '@mcp-agent/core';
import { TaskStrategy, TaskExecutionResult, StrategyConfig } from '../types';

/**
 * MCP strategy for benchmarking
 * Tests MCP agent capabilities with external tools
 */
export class MCPStrategy implements TaskStrategy {
  readonly name = 'MCP';
  readonly description = 'MCP agent with external tool capabilities';
  readonly taskType = 'mcp' as const;

  async createAgent(config: StrategyConfig): Promise<any> {
    // Import dynamically to avoid module resolution issues during build
    // const { MCPAgent } = await import('@mcp-agent/core');

    const agentConfig: MCPAgentOptions = {
      instructions:
        'You are Agent TARS, a helpful assistant that can use the tools available to help users with their questions.',
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp@latest', '--headless'],
        },
      },
      model: {
        provider: 'volcengine',
        id: config.modelId || 'ep-20250613182556-7z8pl', // Use provided modelId or default doubao-1.6
        apiKey: process.env.ARK_API_KEY,
        useResponseApi: config.useResponseApi,
      },
      thinking: {
        type: config.thinking || 'disabled',
      },
    };

    console.log('agentConfig: ', agentConfig);

    const agent = new MCPAgent(agentConfig);

    return agent;
  }

  async executeTask(agent: any): Promise<TaskExecutionResult> {
    try {
      await agent.initialize();

      const answer = await agent.run('Can you find information about the UI-TARS-Desktop');

      return {
        success: true,
        result: answer,
        metadata: {
          taskType: 'mcp',
          toolsUsed: ['playwright_tools'],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          taskType: 'mcp',
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
      console.warn('MCP cleanup error:', error);
    }
  }
}
