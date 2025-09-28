/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, AgentStatus } from '@tarko/interface';
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

  // Group events by conversation turns
  const conversationTurns: { user: CustomLogEntry; responses: CustomLogEntry[] }[] = [];
  let currentTurn: { user: CustomLogEntry; responses: CustomLogEntry[] } | null = null;

  // First step: group events into conversation turns
  for (const log of input.logs) {
    if (log.type === 'user_input') {
      if (currentTurn) {
        conversationTurns.push(currentTurn);
      }
      currentTurn = { user: log, responses: [] };
    } else if (currentTurn) {
      currentTurn.responses.push(log);
    }
  }
  if (currentTurn) {
    conversationTurns.push(currentTurn);
  }

  // Add agent run start event
  events.push({
    id: `event-${eventIdCounter++}`,
    type: 'agent_run_start',
    timestamp: new Date(input.logs[0]?.timestamp || Date.now()).getTime(),
    sessionId: 'custom-session-001',
    runOptions: {
      input: input.logs.find((l) => l.type === 'user_input')?.message || '',
      stream: false,
    },
    provider: 'custom',
    model: 'custom-model',
    modelDisplayName: 'Custom Agent',
    agentName: 'Custom Agent',
  } as AgentEventStream.AgentRunStartEvent);

  // Process each conversation turn
  for (let turnIndex = 0; turnIndex < conversationTurns.length; turnIndex++) {
    const turn = conversationTurns[turnIndex];

    // Generate shared message ID for this turn
    const turnMessageId = `msg-turn-${turnIndex + 1}`;

    // User message
    events.push({
      id: `event-${eventIdCounter++}`,
      type: 'user_message',
      timestamp: new Date(turn.user.timestamp).getTime(),
      content: turn.user.message || '',
    } as AgentEventStream.UserMessageEvent);

    // Collect tool calls for this turn
    const toolExecutions = turn.responses.filter((r) => r.type === 'tool_execution');
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    // Find the primary assistant response (usually the one with tool calls or the final response)
    const responseLogs = turn.responses.filter((r) => r.type === 'agent_response');
    const primaryResponse =
      responseLogs.find((r) => r.parameters?.messageId?.includes('final')) || responseLogs[0];
    const primaryMessageId = primaryResponse?.parameters?.messageId || turnMessageId;

    // Process thinking first (if any)
    const thinkingLogs = turn.responses.filter((r) => r.type === 'agent_thinking');
    for (const thinking of thinkingLogs) {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'assistant_thinking_message',
        timestamp: new Date(thinking.timestamp).getTime(),
        content: thinking.message || '',
        isComplete: thinking.parameters?.isComplete ?? true,
        thinkingDurationMs: thinking.parameters?.thinkingDurationMs,
        messageId: primaryMessageId, // Use the same messageId as the primary response
      } as AgentEventStream.AssistantThinkingMessageEvent);
    }

    // Generate tool call IDs and collect for assistant message
    const toolCallIds: string[] = [];
    for (const toolLog of toolExecutions) {
      const toolCallId = `tool-call-${eventIdCounter++}`;
      toolCallIds.push(toolCallId);
      const toolName = toolLog.tool_name || 'unknown_tool';

      // Collect tool call for assistant message
      toolCalls.push({
        id: toolCallId,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(toolLog.parameters || {}),
        },
      });
    }

    // Assistant message with tool calls (if any)
    for (const responseLog of responseLogs) {
      const hasToolCalls = toolCalls.length > 0;

      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'assistant_message',
        timestamp: new Date(responseLog.timestamp).getTime(),
        content: responseLog.message || '',
        rawContent: responseLog.message,
        toolCalls: hasToolCalls ? [...toolCalls] : undefined,
        finishReason:
          responseLog.parameters?.finishReason || (hasToolCalls ? 'tool_calls' : 'stop'),
        ttftMs: responseLog.parameters?.ttftMs,
        ttltMs: responseLog.parameters?.ttltMs,
        messageId: responseLog.parameters?.messageId || turnMessageId,
      } as AgentEventStream.AssistantMessageEvent);

      // Clear tool calls after first response that uses them
      if (hasToolCalls) {
        toolCalls.length = 0;
      }
    }

    // Add tool call and result events after assistant message
    for (let i = 0; i < toolExecutions.length; i++) {
      const toolLog = toolExecutions[i];
      const toolCallId = toolCallIds[i]; // Use pre-generated ID
      const toolName = toolLog.tool_name || 'unknown_tool';
      const timestamp = new Date(toolLog.timestamp).getTime();

      // Tool call event
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'tool_call',
        timestamp,
        toolCallId,
        name: toolName,
        arguments: toolLog.parameters || {},
        startTime: timestamp,
        tool: {
          name: toolName,
          description: `Tool: ${toolName}`,
          schema: {},
        },
      } as AgentEventStream.ToolCallEvent);

      // Tool result event (if result exists)
      if (toolLog.result) {
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'tool_result',
          timestamp: timestamp + 100,
          toolCallId,
          name: toolName,
          content: toolLog.result,
          elapsedMs: toolLog.parameters?.elapsed_ms || 100,
        } as AgentEventStream.ToolResultEvent);
      }
    }
  }

  // Add agent run end event
  const lastTimestamp = new Date(
    input.logs[input.logs.length - 1]?.timestamp || Date.now(),
  ).getTime();
  const firstTimestamp = new Date(input.logs[0]?.timestamp || Date.now()).getTime();
  events.push({
    id: `event-${eventIdCounter++}`,
    type: 'agent_run_end',
    timestamp: lastTimestamp + 100,
    sessionId: 'custom-session-001',
    iterations: conversationTurns.length,
    elapsedMs: lastTimestamp - firstTimestamp,
    status: AgentStatus.IDLE,
  } as AgentEventStream.AgentRunEndEvent);

  return { events };
});
