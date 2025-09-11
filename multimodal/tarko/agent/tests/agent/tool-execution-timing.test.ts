/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ToolProcessor } from '../../src/agent/runner/tool-processor';
import { ToolManager } from '../../src/agent/tool-manager';
import { AgentEventStreamProcessor } from '../../src/agent/event-stream';
import { Tool, z } from '../../src';
import { getLogger } from '@tarko/shared-utils';

describe('Tool Execution Timing Bug Fix', () => {
  it('should track elapsed time correctly for tool execution errors', async () => {
    // This test verifies the fix for: tool 执行错误时 elapsedMs 显示 0ms
    // The bug was in tool-processor.ts where elapsedMs was hardcoded to 0 for errors
    // After fix: Tool execution errors show actual elapsed time
    
    // Create the components needed for testing
    const logger = getLogger('Test');
    const toolManager = new ToolManager(logger);
    const eventStream = new AgentEventStreamProcessor();
    
    // Create a mock agent for the tool processor
    const mockAgent = {
      onBeforeToolCall: async (sessionId: string, tool: any, args: any) => args,
      onAfterToolCall: async (sessionId: string, tool: any, result: any) => result,
      onToolCallError: async (sessionId: string, tool: any, error: any) => `Error: ${error}`,
      onProcessToolCalls: async () => null,
    };
    
    const toolProcessor = new ToolProcessor(mockAgent as any, toolManager, eventStream);

    // Create a tool that fails after some execution time
    const failingTool = new Tool({
      id: 'failing-tool',
      description: 'A tool that fails after execution time',
      parameters: z.object({}),
      function: async () => {
        // Simulate some work before error occurs
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error('Tool execution failed');
      },
    });

    toolManager.registerTool(failingTool);

    // Capture tool result events
    const toolResultEvents: any[] = [];
    const originalSendEvent = eventStream.sendEvent.bind(eventStream);
    eventStream.sendEvent = (event: any) => {
      if (event.type === 'tool_result') {
        toolResultEvents.push(event);
      }
      return originalSendEvent(event);
    };

    // Test the actual tool processor with the failing tool
    const mockToolCalls = [
      {
        id: 'test-tool-call',
        type: 'function' as const,
        function: {
          name: 'failing-tool',
          arguments: '{}',
        },
      },
    ];

    // Execute the tool calls through the processor
    await toolProcessor.processToolCalls(mockToolCalls, 'test-session');
    
    // Verify that the tool result event was generated with correct timing
    expect(toolResultEvents).toHaveLength(1);
    const toolResultEvent = toolResultEvents[0];
    
    expect(toolResultEvent.toolCallId).toBe('test-tool-call');
    expect(toolResultEvent.name).toBe('failing-tool');
    expect(toolResultEvent.error).toContain('Tool execution failed');
    
    // Key assertion: Before the fix, this would be 0. After the fix, it shows actual elapsed time.
    expect(toolResultEvent.elapsedMs).toBeGreaterThan(15); // Should be around 20ms
    expect(toolResultEvent.elapsedMs).toBeLessThan(50); // Allow some variance
    expect(toolResultEvent.elapsedMs).not.toBe(0); // The main bug fix verification
  });
});
