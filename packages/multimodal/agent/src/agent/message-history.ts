/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Event,
  EventType,
  EventStream,
  AssistantMessageEvent,
  ToolResultEvent,
} from '../types/event-stream';
import { ChatCompletionMessageParam } from '../types/third-party';
import { ToolCallEngine } from '../types/tool-call-engine';
import { AgentSingleLoopReponse, MultimodalToolCallResult, ToolDefinition } from '../types';
import { convertToMultimodalToolCallResult } from '../utils/multimodal';
import { getLogger } from '../utils/logger';

/**
 * MessageHistory - Converts event stream to message history
 * This separates the concerns of event storage from message history formatting
 */
export class MessageHistory {
  private logger = getLogger('MessageHistory');

  constructor(private eventStream: EventStream) {}

  /**
   * Convert events to message history format for LLM context
   * This method uses the provided toolCallEngine to format messages
   * according to the specific requirements of the underlying LLM
   *
   * @param toolCallEngine The tool call engine to use for message formatting
   * @param systemPrompt The base system prompt to include
   * @param tools Available tools to enhance the system prompt
   */
  toMessageHistory(
    toolCallEngine: ToolCallEngine,
    customSystemPrompt: string,
    tools: ToolDefinition[] = [],
  ): ChatCompletionMessageParam[] {
    const baseSystemPrompt = this.getSystemPromptWithTime(customSystemPrompt);
    // Start with the enhanced system message
    const enhancedSystemPrompt = toolCallEngine.preparePrompt(baseSystemPrompt, tools);
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: enhancedSystemPrompt },
    ];

    this.logger.debug(
      `Created system message with prompt ${enhancedSystemPrompt.length} chars long`,
    );

    const events = this.eventStream.getEvents();

    // Process events in chronological order
    let currentIndex = 0;
    while (currentIndex < events.length) {
      const event = events[currentIndex];

      // Process user message
      if (event.type === EventType.USER_MESSAGE) {
        messages.push({
          role: 'user',
          content: event.content,
        });
        currentIndex++;
        continue;
      }

      // Process assistant message with possible tool calls
      if (event.type === EventType.ASSISTANT_MESSAGE) {
        const assistantEvent = event as AssistantMessageEvent;
        const assistantResponse: AgentSingleLoopReponse = {
          content: assistantEvent.content,
          toolCalls: assistantEvent.toolCalls,
        };

        // FIXME: Reuse the parse result of the previous event in previous loop.
        // Use the tool call engine to format the assistant message properly
        const formattedMessage = toolCallEngine.buildHistoricalAssistantMessage(assistantResponse);
        messages.push(formattedMessage);

        // Check if there are tool calls to process
        if (assistantEvent.toolCalls && assistantEvent.toolCalls.length > 0) {
          // Find tool results for these tool calls
          const toolResults = this.findToolResultsForAssistantMessage(assistantEvent, events);

          // Convert to multimodal tool call results
          const multimodalResults: MultimodalToolCallResult[] = toolResults.map((result) =>
            convertToMultimodalToolCallResult(result),
          );

          // Use the tool call engine to format the tool results properly
          if (multimodalResults.length > 0) {
            const toolResultMessages =
              toolCallEngine.buildHistoricalToolCallResultMessages(multimodalResults);
            messages.push(...toolResultMessages);
          }
        }

        currentIndex++;
        continue;
      }

      // Skip other event types
      currentIndex++;
    }

    return messages;
  }

  /**
   * Generate the system prompt with current time
   *
   * @returns Formatted system prompt with current time
   */
  getSystemPromptWithTime(instructions: string): string {
    if (process.env.TEST || process.env.TEST_AGENT_SNAPSHOP || process.env.DUMP_AGENT_SNAPSHOP) {
      return `${instructions}

Current time: 5/20/2025, 10:00:00 AM`;
    }

    return `${instructions}

Current time: ${new Date().toLocaleString()}`;
  }

  /**
   * Helper method to find all tool results associated with an assistant message's tool calls
   */
  private findToolResultsForAssistantMessage(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
  ) {
    const toolResults: { toolCallId: string; toolName: string; content: any }[] = [];

    // If no tool calls in the message, return empty array
    if (!assistantEvent.toolCalls || assistantEvent.toolCalls.length === 0) {
      return toolResults;
    }

    // Get all tool call IDs from the assistant message
    const toolCallIds = assistantEvent.toolCalls.map((tc) => tc.id);

    // Find the corresponding tool results for each tool call ID
    const assistantIndex = events.findIndex((e) => e.id === assistantEvent.id);

    // Look for tool result events after this assistant message
    // and before the next assistant or user message
    let currentIndex = assistantIndex + 1;
    while (currentIndex < events.length) {
      const event = events[currentIndex];

      // Stop if we reach a new conversation turn
      if (
        event.type === EventType.USER_MESSAGE ||
        (event.type === EventType.ASSISTANT_MESSAGE && event !== assistantEvent)
      ) {
        break;
      }

      // Process tool result events
      if (event.type === EventType.TOOL_RESULT) {
        const toolResultEvent = event as ToolResultEvent;
        if (toolCallIds.includes(toolResultEvent.toolCallId)) {
          toolResults.push({
            toolCallId: toolResultEvent.toolCallId,
            toolName: toolResultEvent.name,
            content: toolResultEvent.content,
          });
        }
      }

      currentIndex++;
    }

    return toolResults;
  }
}
