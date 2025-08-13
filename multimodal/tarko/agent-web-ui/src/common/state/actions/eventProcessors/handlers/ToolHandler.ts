import { v4 as uuidv4 } from 'uuid';
import { jsonrepair } from 'jsonrepair';
import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream, ToolResult, Message } from '@/common/types';
import { determineToolType } from '@/common/utils/formatters';
import { messagesAtom } from '@/common/state/atoms/message';
import { toolResultsAtom, toolCallResultMap } from '@/common/state/atoms/tool';
import { activePanelContentAtom } from '@/common/state/atoms/ui';
import { rawToolMappingAtom } from '@/common/state/atoms/rawEvents';
import { toolCallArgumentsCache, streamingToolCallCache } from '../utils/cacheManager';
import { collectFileInfo } from '../utils/fileCollector';
import { normalizeSearchResult } from '../utils/searchNormalizer';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';

export class ToolCallHandler implements EventHandler<AgentEventStream.ToolCallEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.ToolCallEvent {
    return event.type === 'tool_call';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.ToolCallEvent,
  ): void {
    const { set } = context;

    // Store arguments for later use in tool result processing
    if (event.toolCallId && event.arguments) {
      toolCallArgumentsCache.set(event.toolCallId, event.arguments);
    }

    // Save the original tool call
    set(rawToolMappingAtom, (prev) => {
      const sessionMappings = prev[sessionId] || {};
      return {
        ...prev,
        [sessionId]: {
          ...sessionMappings,
          [event.toolCallId]: {
            toolCall: event,
            toolResult: sessionMappings[event.toolCallId]?.toolResult || null,
          },
        },
      };
    });
  }
}

export class ToolResultHandler implements EventHandler<AgentEventStream.ToolResultEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.ToolResultEvent {
    return event.type === 'tool_result';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.ToolResultEvent,
  ): void {
    const { get, set } = context;
    const args = toolCallArgumentsCache.get(event.toolCallId);

    collectFileInfo(
      set,
      sessionId,
      event.name,
      event.toolCallId,
      args,
      event.content,
      event.timestamp,
    );

    // Normalize content for search results
    const normalizedContent = normalizeSearchResult(event.name, event.content, args);

    const result: ToolResult = {
      id: uuidv4(),
      toolCallId: event.toolCallId,
      name: event.name,
      content: normalizedContent,
      timestamp: event.timestamp,
      error: event.error,
      type: determineToolType(event.name, normalizedContent),
      arguments: args,
      elapsedMs: event.elapsedMs,
      _extra: event._extra,
    };

    // Update both message and tool result atoms for immediate UI response
    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];

      const messageIndex = [...sessionMessages]
        .reverse()
        .findIndex((m) => m.toolCalls?.some((tc) => tc.id === result.toolCallId));

      if (messageIndex !== -1) {
        const actualIndex = sessionMessages.length - 1 - messageIndex;
        const message = sessionMessages[actualIndex];
        const toolResults = message.toolResults || [];

        const updatedMessage = {
          ...message,
          toolResults: [...toolResults, result],
        };

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, actualIndex),
            updatedMessage,
            ...sessionMessages.slice(actualIndex + 1),
          ],
        };
      }

      return prev;
    });

    set(toolResultsAtom, (prev: Record<string, ToolResult[]>) => {
      const sessionResults = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionResults, result],
      };
    });

    // Update panel content only for active session
    if (shouldUpdatePanelContent(get, sessionId)) {
      // Special handling for browser vision control to preserve environment context
      if (result.type === 'browser_vision_control') {
        set(activePanelContentAtom, (prev) => {
          if (prev && prev.type === 'image' && prev.environmentId) {
            const environmentId = prev.environmentId;

            return {
              ...prev,
              type: 'browser_vision_control',
              source: event.content,
              title: prev.title,
              timestamp: event.timestamp,
              toolCallId: event.toolCallId,
              error: event.error,
              arguments: args,
              originalContent: prev.source,
              environmentId: environmentId,
              processedEnvironmentIds: [environmentId], // Track processed environment IDs
            };
          } else {
            return {
              type: result.type,
              source: result.content,
              title: result.name,
              timestamp: result.timestamp,
              toolCallId: result.toolCallId,
              error: result.error,
              arguments: args,
            };
          }
        });
      } else {
        set(activePanelContentAtom, {
          type: result.type,
          source: result.content,
          title: result.name,
          timestamp: result.timestamp,
          toolCallId: result.toolCallId,
          error: result.error,
          arguments: args,
          _extra: result._extra,
        });
      }
    }

    toolCallResultMap.set(result.toolCallId, result);

    // Save the original tool result
    set(rawToolMappingAtom, (prev) => {
      const sessionMappings = prev[sessionId] || {};
      const existing = sessionMappings[event.toolCallId] || {
        toolCall: null,
        toolResult: null,
      };
      return {
        ...prev,
        [sessionId]: {
          ...sessionMappings,
          [event.toolCallId]: {
            ...existing,
            toolResult: event,
          },
        },
      };
    });
  }
}

export class StreamingToolCallHandler
  implements EventHandler<AgentEventStream.AssistantStreamingToolCallEvent>
{
  canHandle(
    event: AgentEventStream.Event,
  ): event is AgentEventStream.AssistantStreamingToolCallEvent {
    return event.type === 'assistant_streaming_tool_call';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AssistantStreamingToolCallEvent,
  ): void {
    const { get, set } = context;
    const { toolCallId, toolName, arguments: argsDelta, isComplete, messageId } = event;

    const currentArgs = streamingToolCallCache.get(toolCallId);
    const newArgs = currentArgs + argsDelta;

    streamingToolCallCache.set(toolCallId, newArgs);

    // Safe JSON parsing with repair fallback
    let parsedArgs: unknown = {};
    try {
      if (newArgs) {
        const repairedJson = jsonrepair(newArgs);
        parsedArgs = JSON.parse(repairedJson);
      }
    } catch (error) {
      try {
        const repairedJson = jsonrepair(newArgs + '"');
        parsedArgs = JSON.parse(repairedJson);
      } catch (e) {
        console.error(`ignore parse error chunk`, e);
        return;
      }
    }

    toolCallArgumentsCache.set(toolCallId, parsedArgs);

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      let existingMessageIndex = -1;

      // Find by messageId or fallback to last streaming assistant message
      if (messageId) {
        existingMessageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);
      } else if (sessionMessages.length > 0) {
        const lastMessageIndex = sessionMessages.length - 1;
        const lastMessage = sessionMessages[lastMessageIndex];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          existingMessageIndex = lastMessageIndex;
        }
      }

      if (existingMessageIndex !== -1) {
        const existingMessage = sessionMessages[existingMessageIndex];
        const existingToolCalls = existingMessage.toolCalls || [];

        const toolCallIndex = existingToolCalls.findIndex((tc) => tc.id === toolCallId);
        const updatedToolCalls = [...existingToolCalls];

        if (toolCallIndex !== -1) {
          updatedToolCalls[toolCallIndex] = {
            ...updatedToolCalls[toolCallIndex],
            function: {
              ...updatedToolCalls[toolCallIndex].function,
              name: toolName || updatedToolCalls[toolCallIndex].function.name,
              // @ts-expect-error
              // FIXME: type
              arguments: parsedArgs,
            },
          };
        } else {
          updatedToolCalls.push({
            id: toolCallId,
            type: 'function',
            function: {
              name: toolName,
              // @ts-expect-error
              // FIXME: type
              arguments: parsedArgs,
            },
          });
        }

        const updatedMessage = {
          ...existingMessage,
          toolCalls: updatedToolCalls,
          isStreaming: !isComplete,
        };

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, existingMessageIndex),
            updatedMessage,
            ...sessionMessages.slice(existingMessageIndex + 1),
          ],
        };
      }

      const newMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: event.timestamp,
        isStreaming: !isComplete,
        toolCalls: [
          {
            id: toolCallId,
            type: 'function',
            function: {
              name: toolName,
              arguments: newArgs,
            },
          },
        ],
        messageId,
      };

      return {
        ...prev,
        [sessionId]: [...sessionMessages, newMessage],
      };
    });

    // Real-time preview for write_file operations (only for active session)
    if (
      toolName === 'write_file' &&
      parsedArgs &&
      typeof parsedArgs === 'object' &&
      'path' in parsedArgs &&
      shouldUpdatePanelContent(get, sessionId)
    ) {
      const path = parsedArgs.path;
      const content = 'content' in parsedArgs ? parsedArgs.content : '';

      if (typeof path === 'string') {
        set(activePanelContentAtom, {
          type: 'file',
          source: typeof content === 'string' ? content : '',
          title: `Writing: ${path.split('/').pop()}`,
          timestamp: event.timestamp,
          toolCallId,
          arguments: parsedArgs,
          isStreaming: !isComplete,
        });
      }
    }

    if (isComplete) {
      streamingToolCallCache.delete(toolCallId);
    }
  }
}
