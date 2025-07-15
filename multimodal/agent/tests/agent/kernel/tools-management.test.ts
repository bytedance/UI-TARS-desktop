/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Tool, z } from '../../../src';
import { createTestAgent, setupAgentTest } from './utils/testUtils';

describe('Tool Management', () => {
  const testContext = setupAgentTest();

  describe('onRetrieveTools hook', () => {
    it('should return all tools by default', async () => {
      const agent = createTestAgent({}, testContext);

      // Create and register test tools
      const tool1 = new Tool({
        id: 'tool1',
        description: 'Tool 1',
        parameters: z.object({}),
        function: async () => 'result1',
      });

      const tool2 = new Tool({
        id: 'tool2',
        description: 'Tool 2',
        parameters: z.object({}),
        function: async () => 'result2',
      });

      agent.registerTool(tool1);
      agent.registerTool(tool2);

      // Get available tools using the hook
      const availableTools = await agent.getAvailableTools();

      // Default implementation should return all tools
      expect(availableTools).toHaveLength(2);
      expect(availableTools.map((t) => t.name)).toContain('tool1');
      expect(availableTools.map((t) => t.name)).toContain('tool2');
    });

    it('should allow filtering tools', async () => {
      // Create a custom agent class with overridden hook
      class FilteringAgent extends Agent {
        override onRetrieveTools(tools: Tool[]): Tool[] {
          // Only return tools with "allowed" in the name
          return tools.filter((tool) => tool.name.includes('allowed'));
        }
      }

      const agent = new FilteringAgent();

      // Create and register test tools
      const tool1 = new Tool({
        id: 'allowed-tool',
        description: 'Allowed Tool',
        parameters: z.object({}),
        function: async () => 'result1',
      });

      const tool2 = new Tool({
        id: 'restricted-tool',
        description: 'Restricted Tool',
        parameters: z.object({}),
        function: async () => 'result2',
      });

      agent.registerTool(tool1);
      agent.registerTool(tool2);

      // Get available tools using the hook
      const availableTools = await agent.getAvailableTools();

      // Hook should filter out restricted tools
      expect(availableTools).toHaveLength(1);
      expect(availableTools[0].name).toBe('allowed-tool');
    });

    it('should allow modifying tool properties', async () => {
      // Create a custom agent class with overridden hook
      class EnhancingAgent extends Agent {
        override onRetrieveTools(tools: Tool[]): Tool[] {
          // Enhance tool descriptions
          return tools.map((tool) => ({
            ...tool,
            description: `[Enhanced] ${tool.description}`,
          }));
        }
      }

      const agent = new EnhancingAgent();

      // Create and register a test tool
      const tool = new Tool({
        id: 'basic-tool',
        description: 'Basic Tool',
        parameters: z.object({}),
        function: async () => 'result',
      });

      agent.registerTool(tool);

      // Get available tools using the hook
      const availableTools = await agent.getAvailableTools();

      // Hook should enhance tool descriptions
      expect(availableTools).toHaveLength(1);
      expect(availableTools[0].description).toBe('[Enhanced] Basic Tool');
    });

    it('should handle async hook implementation', async () => {
      // Create a custom agent class with async hook
      class AsyncAgent extends Agent {
        override async onRetrieveTools(tools: Tool[]): Promise<Tool[]> {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return tools.filter((tool) => !tool.name.includes('slow'));
        }
      }

      const agent = new AsyncAgent();

      // Create and register test tools
      const tool1 = new Tool({
        id: 'fast-tool',
        description: 'Fast Tool',
        parameters: z.object({}),
        function: async () => 'result1',
      });

      const tool2 = new Tool({
        id: 'slow-tool',
        description: 'Slow Tool',
        parameters: z.object({}),
        function: async () => 'result2',
      });

      agent.registerTool(tool1);
      agent.registerTool(tool2);

      // Get available tools using the async hook
      const availableTools = await agent.getAvailableTools();

      // Hook should filter out slow tools
      expect(availableTools).toHaveLength(1);
      expect(availableTools[0].name).toBe('fast-tool');
    });

    it('should handle errors in hook implementation', async () => {
      // Create a custom agent class with a hook that throws
      class ErrorAgent extends Agent {
        override onRetrieveTools(): Tool[] {
          throw new Error('Hook failure test');
        }
      }

      const agent = new ErrorAgent();
      const spy = vi.spyOn(agent.logger, 'error');

      // Create and register a test tool
      const tool = new Tool({
        id: 'error-tool',
        description: 'Error Tool',
        parameters: z.object({}),
        function: async () => 'result',
      });

      agent.registerTool(tool);

      // Get available tools with failing hook
      const availableTools = await agent.getAvailableTools();

      // Should log error and return all tools
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[Agent] Error in onRetrieveTools hook'),
      );
      expect(availableTools).toHaveLength(1);
      expect(availableTools[0].name).toBe('error-tool');
    });
  });

  describe('getAvailableTools method', () => {
    it('should return registered tools after applying hook', async () => {
      const agent = createTestAgent({}, testContext);

      // Spy on onRetrieveTools
      const spy = vi.spyOn(agent, 'onRetrieveTools');

      // Create and register test tools
      const tool1 = new Tool({
        id: 'tool1',
        description: 'Tool 1',
        parameters: z.object({}),
        function: async () => 'result1',
      });

      const tool2 = new Tool({
        id: 'tool2',
        description: 'Tool 2',
        parameters: z.object({}),
        function: async () => 'result2',
      });

      agent.registerTool(tool1);
      agent.registerTool(tool2);

      // Get available tools
      const availableTools = await agent.getAvailableTools();

      // Should return all tools and call the hook
      expect(spy).toHaveBeenCalledTimes(1);
      expect(availableTools).toHaveLength(2);
    });
  });
});
