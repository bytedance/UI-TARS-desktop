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
export default defineTransformer<
  CustomLogFormat | AgentEventStream.Event[] | { events: AgentEventStream.Event[] }
>((input) => {
  // Handle custom log format
  if (input.logs && Array.isArray(input.logs)) {
    const events: AgentEventStream.Event[] = [];

    for (const log of input.logs) {
      if (log.type === 'user_input') {
        events.push({
          type: 'user-message',
          timestamp: new Date(log.timestamp).getTime(),
          data: {
            content: log.message,
            role: 'user',
          },
        });
      } else if (log.type === 'agent_response') {
        events.push({
          type: 'agent-message',
          timestamp: new Date(log.timestamp).getTime(),
          data: {
            content: log.message,
            role: 'assistant',
          },
        });
      } else if (log.type === 'tool_execution') {
        events.push({
          type: 'tool-call',
          timestamp: new Date(log.timestamp).getTime(),
          data: {
            toolName: log.tool_name,
            parameters: log.parameters,
          },
        });

        if (log.result) {
          events.push({
            type: 'tool-result',
            timestamp: new Date(log.timestamp).getTime() + 100,
            data: {
              toolName: log.tool_name,
              result: log.result,
            },
          });
        }
      }
    }

    return { events };
  }

  // Handle simple array format
  if (Array.isArray(input)) {
    return { events: input };
  }

  // Handle object with events array
  if (input.events && Array.isArray(input.events)) {
    return input;
  }

  throw new Error('Unsupported input format for transformer');
});
