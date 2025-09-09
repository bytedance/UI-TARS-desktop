/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';
import { defineTransformer } from '@tarko/agent-ui-cli';
import type { ChatCompletionMessageToolCall } from '@tarko/model-provider/types';

/**
 * Custom log format interfaces
 */
interface CustomLogEntry {
  type: 'user_input' | 'tool_execution' | 'agent_response' | 'agent_thinking';
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
  let currentLoopToolCalls: ChatCompletionMessageToolCall[] = [];

  for (let i = 0; i < input.logs.length; i++) {
    const log = input.logs[i];
    const timestamp = new Date(log.timestamp).getTime();

    if (log.type === 'user_input') {
      // Reset tool calls for new user input
      currentLoopToolCalls = [];
      
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
        rawContent: log.message,
        toolCalls: currentLoopToolCalls.length > 0 ? currentLoopToolCalls : undefined,
        finishReason: log.parameters?.finishReason || (currentLoopToolCalls.length > 0 ? 'tool_calls' : 'stop'),
        ttftMs: log.parameters?.ttftMs,
        ttltMs: log.parameters?.ttltMs,
        messageId: log.parameters?.messageId || `msg-${eventIdCounter}`,
      } as AgentEventStream.AssistantMessageEvent);
      
      // Reset tool calls after agent response
      currentLoopToolCalls = [];
    } else if (log.type === 'agent_thinking') {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'assistant_thinking_message',
        timestamp,
        content: log.message || '',
        isComplete: log.parameters?.isComplete ?? true,
        thinkingDurationMs: log.parameters?.thinkingDurationMs,
        messageId: log.parameters?.messageId || `thinking-${eventIdCounter}`,
      } as AgentEventStream.AssistantThinkingMessageEvent);
    } else if (log.type === 'tool_execution') {
      const toolCallId = `tool-call-${eventIdCounter++}`; // 生成唯一 ID
      const toolName = log.tool_name || 'unknown_tool';

      // Collect tool call for assistant message
      currentLoopToolCalls.push({
        id: toolCallId,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(log.parameters || {}),
        },
      });

      // Tool call event
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'tool_call',
        timestamp,
        toolCallId, // 使用相同的 toolCallId
        name: toolName,
        arguments: log.parameters || {},
        startTime: timestamp,
        tool: {
          name: toolName,
          description: `Tool: ${toolName}`,
          schema: {},
        },
      } as AgentEventStream.ToolCallEvent);

      // Tool result event (if result exists)
      if (log.result) {
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'tool_result',
          timestamp: timestamp + 100,
          toolCallId, // 使用相同的 toolCallId
          name: toolName,
          content: log.result,
          elapsedMs: log.parameters?.elapsed_ms || 100,
        } as AgentEventStream.ToolResultEvent);
      }
    }
  }

  return { events };
});
