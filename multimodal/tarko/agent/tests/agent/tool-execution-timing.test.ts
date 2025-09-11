/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Tool, z } from '../../src';
import { createTestAgent, setupAgentTest } from './kernel/utils/testUtils';
import { AgentEventStream } from '@tarko/agent-interface';

describe('Tool Execution Timing', () => {
  const testContext = setupAgentTest();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('elapsedMs calculation', () => {
    it('should track elapsed time for successful tool execution', async () => {
      const agent = createTestAgent({}, testContext);

      // Create a tool that takes some time to execute
      const delayTool = new Tool({
        id: 'delay-tool',
        description: 'A tool that takes time to execute',
        parameters: z.object({}),
        function: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'success';
        },
      });

      agent.registerTool(delayTool);

      // Capture events from the event stream
      const events: AgentEventStream.Event[] = [];
      const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
      vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
        events.push(event);
        return originalSendEvent(event);
      });

      // Access the tool processor through the runner
      const toolProcessor = (agent as any).runner.toolProcessor;

      // Execute tool call
      const toolCalls = [
        {
          id: 'test-call-1',
          type: 'function' as const,
          function: {
            name: 'delay-tool',
            arguments: '{}',
          },
        },
      ];

      await toolProcessor.processToolCalls(toolCalls, 'test-session');

      // Find the tool result event
      const toolResultEvent = events.find((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent;
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent.elapsedMs).toBeGreaterThan(40); // Should be around 50ms
      expect(toolResultEvent.elapsedMs).toBeLessThan(100); // Allow some variance
      expect(toolResultEvent.error).toBeUndefined();
    });

    it('should track elapsed time for failed tool execution', async () => {
      const agent = createTestAgent({}, testContext);

      // Create a tool that fails after some time
      const failingTool = new Tool({
        id: 'failing-tool',
        description: 'A tool that fails after some time',
        parameters: z.object({}),
        function: async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          throw new Error('Tool execution failed');
        },
      });

      agent.registerTool(failingTool);

      // Capture events from the event stream
      const events: AgentEventStream.Event[] = [];
      const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
      vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
        events.push(event);
        return originalSendEvent(event);
      });

      // Access the tool processor through the runner
      const toolProcessor = (agent as any).runner.toolProcessor;

      // Execute tool call
      const toolCalls = [
        {
          id: 'test-call-2',
          type: 'function' as const,
          function: {
            name: 'failing-tool',
            arguments: '{}',
          },
        },
      ];

      await toolProcessor.processToolCalls(toolCalls, 'test-session');

      // Find the tool result event
      const toolResultEvent = events.find((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent;
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent.elapsedMs).toBeGreaterThan(25); // Should be around 30ms
      expect(toolResultEvent.elapsedMs).toBeLessThan(60); // Allow some variance
      expect(toolResultEvent.error).toBe('Error: Tool execution failed');
    });

    it('should track elapsed time for MCP timeout errors', async () => {
      const agent = createTestAgent({}, testContext);

      // Create a tool that simulates MCP timeout
      const timeoutTool = new Tool({
        id: 'timeout-tool',
        description: 'A tool that simulates MCP timeout',
        parameters: z.object({}),
        function: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          throw new Error('McpError: MCP error -32001: Request timed out');
        },
      });

      agent.registerTool(timeoutTool);

      // Capture events from the event stream
      const events: AgentEventStream.Event[] = [];
      const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
      vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
        events.push(event);
        return originalSendEvent(event);
      });

      // Access the tool processor through the runner
      const toolProcessor = (agent as any).runner.toolProcessor;

      // Execute tool call
      const toolCalls = [
        {
          id: 'test-call-3',
          type: 'function' as const,
          function: {
            name: 'timeout-tool',
            arguments: '{}',
          },
        },
      ];

      await toolProcessor.processToolCalls(toolCalls, 'test-session');

      // Find the tool result event
      const toolResultEvent = events.find((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent;
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent.elapsedMs).toBeGreaterThan(15); // Should be around 20ms
      expect(toolResultEvent.elapsedMs).toBeLessThan(40); // Allow some variance
      expect(toolResultEvent.error).toContain('MCP error -32001: Request timed out');
      
      // The key assertion: elapsedMs should NOT be 0 for timeout errors
      expect(toolResultEvent.elapsedMs).not.toBe(0);
    });

    it('should demonstrate the fix for MCP timeout display issue', async () => {
      // This test demonstrates that our fix correctly tracks elapsed time for errors
      // Previously, MCP timeouts and other errors would show 0ms
      // Now they show the actual time elapsed before the error occurred
      
      const agent = createTestAgent({}, testContext);

      // Create a tool that simulates various error scenarios
      const errorTool = new Tool({
        id: 'error-simulation-tool',
        description: 'A tool that simulates different error types',
        parameters: z.object({ errorType: z.string() }),
        function: async (args: { errorType: string }) => {
          await new Promise((resolve) => setTimeout(resolve, 15)); // Always take some time
          
          switch (args.errorType) {
            case 'mcp-timeout':
              throw new Error('McpError: MCP error -32001: Request timed out');
            case 'network-error':
              throw new Error('Network request failed after timeout');
            case 'general-error':
              throw new Error('General tool execution error');
            default:
              return 'success';
          }
        },
      });

      agent.registerTool(errorTool);

      // Capture events from the event stream
      const events: AgentEventStream.Event[] = [];
      const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
      vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
        events.push(event);
        return originalSendEvent(event);
      });

      // Access the tool processor through the runner
      const toolProcessor = (agent as any).runner.toolProcessor;

      // Test different error scenarios
      const errorTypes = ['mcp-timeout', 'network-error', 'general-error'];
      
      for (let i = 0; i < errorTypes.length; i++) {
        const errorType = errorTypes[i];
        const toolCalls = [
          {
            id: `test-call-error-${i}`,
            type: 'function' as const,
            function: {
              name: 'error-simulation-tool',
              arguments: JSON.stringify({ errorType }),
            },
          },
        ];

        await toolProcessor.processToolCalls(toolCalls, 'test-session');
      }

      // Find all tool result events
      const toolResultEvents = events.filter((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent[];
      expect(toolResultEvents).toHaveLength(3);
      
      // Verify that ALL error scenarios now track elapsed time correctly
      toolResultEvents.forEach((event, index) => {
        expect(event.elapsedMs).toBeGreaterThan(10); // Should be around 15ms
        expect(event.elapsedMs).toBeLessThan(50); // Allow some variance
        expect(event.error).toBeDefined();
        
        // The key assertion: elapsedMs should NOT be 0 for ANY error type
        expect(event.elapsedMs).not.toBe(0);
      });
    });

    it('should handle tool not found with 0 elapsed time', async () => {
      const agent = createTestAgent({}, testContext);

      // Capture events from the event stream
      const events: AgentEventStream.Event[] = [];
      const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
      vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
        events.push(event);
        return originalSendEvent(event);
      });

      // Access the tool processor through the runner
      const toolProcessor = (agent as any).runner.toolProcessor;

      // Execute tool call for non-existent tool
      const toolCalls = [
        {
          id: 'test-call-5',
          type: 'function' as const,
          function: {
            name: 'non-existent-tool',
            arguments: '{}',
          },
        },
      ];

      await toolProcessor.processToolCalls(toolCalls, 'test-session');

      // Find the tool result event
      const toolResultEvent = events.find((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent;
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent.elapsedMs).toBe(0); // Tool not found should be 0
      expect(toolResultEvent.error).toContain('Tool "non-existent-tool" not found');
    });

    it('should track elapsed time for processing errors outside tool execution', async () => {
      const agent = createTestAgent({}, testContext);

      // Create a valid tool
      const validTool = new Tool({
        id: 'valid-tool',
        description: 'A valid tool',
        parameters: z.object({}),
        function: async () => 'success',
      });

      agent.registerTool(validTool);

      // Capture events from the event stream
      const events: AgentEventStream.Event[] = [];
      const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
      vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
        events.push(event);
        return originalSendEvent(event);
      });

      // Access the tool processor through the runner
      const toolProcessor = (agent as any).runner.toolProcessor;

      // Execute tool call with invalid JSON arguments to trigger parsing error
      const toolCalls = [
        {
          id: 'test-call-6',
          type: 'function' as const,
          function: {
            name: 'valid-tool',
            arguments: '{invalid json}', // This will cause JSON.parse to throw
          },
        },
      ];

      await toolProcessor.processToolCalls(toolCalls, 'test-session');

      // Find the tool result event
      const toolResultEvent = events.find((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent;
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent.elapsedMs).toBeGreaterThanOrEqual(0); // Should track time even for parsing errors
      expect(toolResultEvent.error).toBeDefined();
    });
  });
});
