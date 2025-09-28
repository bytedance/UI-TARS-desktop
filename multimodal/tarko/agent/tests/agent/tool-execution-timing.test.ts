/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Tool, z } from '../../src';
import { AgentEventStream } from '@tarko/agent-interface';
import {
  createTestAgent,
  setupAgentTest,
  createMockToolCall,
  getAgentInternals,
} from './kernel/utils/testUtils';

describe('Tool Execution Timing Bug Fix', () => {
  const testContext = setupAgentTest();

  it('should track elapsed time for tool execution errors', async () => {
    const agent = createTestAgent({}, testContext);

    const failingTool = new Tool({
      id: 'failing-tool',
      description: 'A tool that fails after execution time',
      parameters: z.object({}),
      function: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error('Tool execution failed');
      },
    });

    agent.registerTool(failingTool);

    const toolResultEvents: AgentEventStream.ToolResultEvent[] = [];
    const eventStream = agent.getEventStream();

    const unsubscribe = eventStream.subscribeToTypes(['tool_result'], (event) => {
      toolResultEvents.push(event as AgentEventStream.ToolResultEvent);
    });

    const agentInternals = getAgentInternals(agent);
    const mockToolCalls = [createMockToolCall('failing-tool', {}, 'test-tool-call')];

    await agentInternals.runner.toolProcessor.processToolCalls(mockToolCalls, 'test-session');

    expect(toolResultEvents).toHaveLength(1);
    const toolResultEvent = toolResultEvents[0];

    expect(toolResultEvent.toolCallId).toBe('test-tool-call');
    expect(toolResultEvent.name).toBe('failing-tool');
    expect(toolResultEvent.error).toContain('Tool execution failed');
    expect(toolResultEvent.elapsedMs).toBeGreaterThan(15);
    expect(toolResultEvent.elapsedMs).toBeLessThan(50);
    expect(toolResultEvent.elapsedMs).not.toBe(0);

    unsubscribe();
  });
});
