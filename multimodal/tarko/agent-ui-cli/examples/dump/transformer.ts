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
  type:
    | 'user_input'
    | 'agent_response'
    | 'agent_thinking'
    | 'tool_execution'
    | 'system_message'
    | 'session_start'
    | 'session_end'
    | 'environment_input'
    | 'plan_start'
    | 'plan_update'
    | 'plan_finish'
    | 'final_answer';
  timestamp: string;
  message?: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  result?: Record<string, any>;

  // Additional fields for different event types
  level?: 'info' | 'warning' | 'error';
  session_id?: string;
  iterations?: number;
  elapsed_ms?: number;
  status?: string;
  thinking_duration_ms?: number;
  environment_type?: string;
  environment_description?: string;
  plan_steps?: Array<{ content: string; done: boolean }>;
  plan_summary?: string;
  is_deep_research?: boolean;
  answer_title?: string;
  answer_format?: string;
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

    switch (log.type) {
      case 'user_input':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'user_message',
          timestamp,
          content: log.message || '',
        } as AgentEventStream.UserMessageEvent);
        break;

      case 'agent_response':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'assistant_message',
          timestamp,
          content: log.message || '',
        } as AgentEventStream.AssistantMessageEvent);
        break;

      case 'agent_thinking':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'assistant_thinking_message',
          timestamp,
          content: log.message || '',
          isComplete: true,
          thinkingDurationMs: log.thinking_duration_ms || 0,
        } as AgentEventStream.AssistantThinkingMessageEvent);
        break;

      case 'tool_execution':
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
            elapsedMs: log.elapsed_ms || 100,
          } as AgentEventStream.ToolResultEvent);
        }
        break;

      case 'system_message':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'system',
          timestamp,
          level: log.level || 'info',
          message: log.message || '',
          details: log.parameters,
        } as AgentEventStream.SystemEvent);
        break;

      case 'session_start':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'agent_run_start',
          timestamp,
          sessionId: log.session_id || `session-${timestamp}`,
          runOptions: {
            maxIterations: 10,
            timeoutMs: 300000,
          },
          agentName: 'Custom Agent',
        } as AgentEventStream.AgentRunStartEvent);
        break;

      case 'session_end':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'agent_run_end',
          timestamp,
          sessionId: log.session_id || `session-${timestamp}`,
          iterations: log.iterations || 1,
          elapsedMs: log.elapsed_ms || 0,
          status: (log.status as any) || 'completed',
        } as AgentEventStream.AgentRunEndEvent);
        break;

      case 'environment_input':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'environment_input',
          timestamp,
          content: log.message || '',
          description: log.environment_description,
          metadata: {
            type: log.environment_type || 'text',
          },
        } as AgentEventStream.EnvironmentInputEvent);
        break;

      case 'plan_start':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'plan_start',
          timestamp,
          sessionId: log.session_id || `session-${timestamp}`,
        } as AgentEventStream.PlanStartEvent);
        break;

      case 'plan_update':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'plan_update',
          timestamp,
          sessionId: log.session_id || `session-${timestamp}`,
          steps: log.plan_steps || [],
        } as AgentEventStream.PlanUpdateEvent);
        break;

      case 'plan_finish':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'plan_finish',
          timestamp,
          sessionId: log.session_id || `session-${timestamp}`,
          summary: log.plan_summary || 'Plan completed',
        } as AgentEventStream.PlanFinishEvent);
        break;

      case 'final_answer':
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'final_answer',
          timestamp,
          content: log.message || '',
          isDeepResearch: log.is_deep_research || false,
          title: log.answer_title,
          format: log.answer_format || 'text',
        } as AgentEventStream.FinalAnswerEvent);
        break;

      default:
        // Handle unknown types as system events
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'system',
          timestamp,
          level: 'info',
          message: `Unknown event type: ${log.type}`,
          details: log,
        } as AgentEventStream.SystemEvent);
        break;
    }
  }

  return { events };
});
