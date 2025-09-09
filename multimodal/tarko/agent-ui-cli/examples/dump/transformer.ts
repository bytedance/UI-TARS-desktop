/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';
import { defineTransformer } from '@tarko/agent-ui-cli';

/**
 * Custom log format interfaces
 */
interface CustomLogEntry {
  type: 'user_input' | 'tool_execution' | 'agent_response';
  timestamp: string;
  message?: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  result?: Record<string, any>;
}

interface CustomLogFormat {
  logs: CustomLogEntry[];
}

/**
 * Example transformer that converts a custom log format to Agent Event Stream
 * This demonstrates how to transform non-standard trace formats
 */
export default defineTransformer<CustomLogFormat>((input) => {
  const events: AgentEventStream.Event[] = [];
  let eventIdCounter = 1;

  for (const log of input.logs) {
    const timestamp = new Date(log.timestamp).getTime();

    if (log.type === 'user_input') {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'user_message',
        timestamp,
        content: log.message || '',
      } as AgentEventStream.UserMessageEvent);
    } else if (log.type === 'agent_response') {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'assistant_message',
        timestamp,
        content: log.message || '',
      } as AgentEventStream.AssistantMessageEvent);
    } else if (log.type === 'tool_execution') {
      const toolCallId = `tool-call-${eventIdCounter}`;

      // Tool call event
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'tool_call',
        timestamp,
        toolCallId,
        name: log.tool_name || 'unknown_tool',
        arguments: log.parameters || {},
        startTime: timestamp,
        tool: {
          name: log.tool_name || 'unknown_tool',
          description: `Tool: ${log.tool_name}`,
          schema: {},
        },
      } as AgentEventStream.ToolCallEvent);

      // Tool result event (if result exists)
      if (log.result) {
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'tool_result',
          timestamp: timestamp + 100,
          toolCallId,
          name: log.tool_name || 'unknown_tool',
          content: log.result,
          elapsedMs: 100,
        } as AgentEventStream.ToolResultEvent);
      }
    }
  }

  return { events };
});
