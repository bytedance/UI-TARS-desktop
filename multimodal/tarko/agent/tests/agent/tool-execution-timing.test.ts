/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { Tool, z } from '../../src';
import { createTestAgent, setupAgentTest } from './kernel/utils/testUtils';
import { AgentEventStream } from '@tarko/agent-interface';

describe('Tool Execution Timing Bug Fix', () => {
  const testContext = setupAgentTest();

  it('should display actual elapsed time instead of 0ms for MCP timeout errors', async () => {
    // This test verifies the fix for: MCP 执行超时，前端展示 0ms
    // Previously: MCP timeouts showed 0ms in the UI
    // After fix: MCP timeouts show actual elapsed time before timeout
    
    const agent = createTestAgent({}, testContext);

    // Create a tool that simulates MCP timeout after some execution time
    const mcpTimeoutTool = new Tool({
      id: 'mcp-timeout-tool',
      description: 'Simulates MCP timeout error',
      parameters: z.object({}),
      function: async () => {
        // Simulate some work before timeout occurs
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error('McpError: MCP error -32001: Request timed out');
      },
    });

    agent.registerTool(mcpTimeoutTool);

    // Capture events from the event stream
    const events: AgentEventStream.Event[] = [];
    const originalSendEvent = agent.getEventStream().sendEvent.bind(agent.getEventStream());
    vi.spyOn(agent.getEventStream(), 'sendEvent').mockImplementation((event) => {
      events.push(event);
      return originalSendEvent(event);
    });

    // Execute the tool that will timeout
    const toolProcessor = (agent as any).runner.toolProcessor;
    const toolCalls = [
      {
        id: 'mcp-timeout-test',
        type: 'function' as const,
        function: {
          name: 'mcp-timeout-tool',
          arguments: '{}',
        },
      },
    ];

    await toolProcessor.processToolCalls(toolCalls, 'test-session');

    // Verify the fix: elapsedMs should show actual time, not 0
    const toolResultEvent = events.find((e) => e.type === 'tool_result') as AgentEventStream.ToolResultEvent;
    expect(toolResultEvent).toBeDefined();
    expect(toolResultEvent.error).toContain('MCP error -32001: Request timed out');
    
    // Key assertion: Before the fix, this would be 0. After the fix, it shows actual elapsed time.
    expect(toolResultEvent.elapsedMs).toBeGreaterThan(15); // Should be around 20ms
    expect(toolResultEvent.elapsedMs).toBeLessThan(50); // Allow some variance
    expect(toolResultEvent.elapsedMs).not.toBe(0); // The main bug fix verification
  });
});
