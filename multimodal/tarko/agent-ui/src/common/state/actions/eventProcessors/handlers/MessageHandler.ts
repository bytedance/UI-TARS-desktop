import { v4 as uuidv4 } from 'uuid';
import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { sessionPanelContentAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';

// Constants for thinking message newline trimming performance
const LEADING_NEWLINES_REGEX = /^\n+/;
const NEWLINE_CHAR = '\n';

export class UserMessageHandler implements EventHandler<AgentEventStream.UserMessageEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.UserMessageEvent {
    return event.type === 'user_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.UserMessageEvent,
  ): void {
    const { get, set } = context;

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];

      // Check if we have any local user messages - if so, skip this server event entirely
      const hasLocalUserMessage = sessionMessages.some(
        (msg) => msg.role === 'user' && msg.isLocalMessage,
      );

      // If we have a local user message, ignore the server event to prevent flicker
      if (hasLocalUserMessage) {
        return prev; // Return unchanged state
      }

      // No local message found, add the server message normally
      const userMessage: Message = {
        id: event.id,
        role: 'user',
        content: event.content,
        timestamp: event.timestamp,
      };

      return {
        ...prev,
        [sessionId]: [...sessionMessages, userMessage],
      };
    });

    // Auto-show user uploaded images in workspace panel (only for active session)
    if (Array.isArray(event.content) && shouldUpdatePanelContent(get, sessionId)) {
      const images = event.content.filter(
        (part): part is { type: 'image_url'; image_url: { url: string } } =>
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          part.type === 'image_url' &&
          'image_url' in part &&
          typeof part.image_url === 'object' &&
          part.image_url !== null &&
          'url' in part.image_url &&
          typeof part.image_url.url === 'string',
      );

      if (images.length > 0) {
        set(sessionPanelContentAtom, (prev) => ({
          ...prev,
          [sessionId]: {
            type: 'image',
            source: images[0].image_url.url,
            title: 'User Upload',
            timestamp: Date.now(),
          },
        }));
      }
    }
  }
}

export class AssistantMessageHandler
  implements EventHandler<AgentEventStream.AssistantMessageEvent>
{
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.AssistantMessageEvent {
    return event.type === 'assistant_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AssistantMessageEvent,
  ): void {
    const { get, set } = context;
    const messageId = event.messageId;

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];

      // Update existing message if messageId matches, otherwise create new
      if (messageId) {
        const existingMessageIndex = sessionMessages.findIndex(
          (msg) => msg.messageId === messageId,
        );

        if (existingMessageIndex !== -1) {
          const updatedMessages = [...sessionMessages];
          updatedMessages[existingMessageIndex] = {
            ...updatedMessages[existingMessageIndex],
            content: event.content,
            timestamp: event.timestamp,
            toolCalls: event.toolCalls,
            finishReason: event.finishReason,
            isStreaming: false,
            ttftMs: event.ttftMs,
            ttltMs: event.ttltMs,
          };

          return {
            ...prev,
            [sessionId]: updatedMessages,
          };
        }
      }

      return {
        ...prev,
        [sessionId]: [
          ...sessionMessages,
          {
            id: event.id,
            role: 'assistant',
            content: event.content,
            timestamp: event.timestamp,
            toolCalls: event.toolCalls,
            finishReason: event.finishReason,
            messageId: messageId,
            ttftMs: event.ttftMs,
            ttltMs: event.ttltMs,
          },
        ],
      };
    });
  }
}

export class StreamingMessageHandler
  implements EventHandler<AgentEventStream.AssistantStreamingMessageEvent>
{
  canHandle(
    event: AgentEventStream.Event,
  ): event is AgentEventStream.AssistantStreamingMessageEvent {
    return event.type === 'assistant_streaming_message';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AssistantStreamingMessageEvent,
  ): void {
    const { set } = context;

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      const messageIdToFind = event.messageId;
      let existingMessageIndex = -1;

      // Find by messageId first, fallback to last streaming message
      if (messageIdToFind) {
        existingMessageIndex = sessionMessages.findIndex(
          (msg) => msg.messageId === messageIdToFind,
        );
      } else if (sessionMessages.length > 0) {
        const lastMessageIndex = sessionMessages.length - 1;
        const lastMessage = sessionMessages[lastMessageIndex];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
          existingMessageIndex = lastMessageIndex;
        }
      }

      if (existingMessageIndex !== -1) {
        const existingMessage = sessionMessages[existingMessageIndex];
        const updatedMessage = {
          ...existingMessage,
          content:
            typeof existingMessage.content === 'string'
              ? existingMessage.content + event.content
              : event.content,
          isStreaming: !event.isComplete,
          toolCalls: event.toolCalls || existingMessage.toolCalls,
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
        id: event.id || uuidv4(),
        role: 'assistant',
        content: event.content,
        timestamp: event.timestamp,
        isStreaming: !event.isComplete,
        toolCalls: event.toolCalls,
        messageId: event.messageId,
      };

      return {
        ...prev,
        [sessionId]: [...sessionMessages, newMessage],
      };
    });
  }
}

export class ThinkingMessageHandler
  implements
    EventHandler<
      | AgentEventStream.AssistantThinkingMessageEvent
      | AgentEventStream.AssistantStreamingThinkingMessageEvent
    >
{
  canHandle(
    event: AgentEventStream.Event,
  ): event is
    | AgentEventStream.AssistantThinkingMessageEvent
    | AgentEventStream.AssistantStreamingThinkingMessageEvent {
    return (
      event.type === 'assistant_thinking_message' ||
      event.type === 'assistant_streaming_thinking_message'
    );
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event:
      | AgentEventStream.AssistantThinkingMessageEvent
      | AgentEventStream.AssistantStreamingThinkingMessageEvent,
  ): void {
    const { set } = context;
    const eventMessageId = event.messageId || `${sessionId}-thinking`;

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      let existingMessageIndex = -1;

      if (eventMessageId) {
        existingMessageIndex = sessionMessages.findIndex(
          (msg) => msg.messageId === eventMessageId && msg.role === 'assistant',
        );
      }

      const thinkingDuration =
        event.type === 'assistant_thinking_message'
          ? (event as AgentEventStream.AssistantThinkingMessageEvent).thinkingDurationMs
          : undefined;

      if (existingMessageIndex !== -1) {
        const message = sessionMessages[existingMessageIndex];
        let newThinking: string;

        if (event.type === 'assistant_streaming_thinking_message') {
          const contentToAdd =
            (message.thinking || '').length === 0 && event.content.startsWith(NEWLINE_CHAR)
              ? event.content.replace(LEADING_NEWLINES_REGEX, '')
              : event.content;
          newThinking = (message.thinking || '') + contentToAdd;
        } else {
          newThinking = event.content.startsWith(NEWLINE_CHAR)
            ? event.content.replace(LEADING_NEWLINES_REGEX, '')
            : event.content;
        }

        const updatedMessage = {
          ...message,
          thinking: newThinking,
          messageId: eventMessageId || message.messageId,
          isStreaming: event.type === 'assistant_streaming_thinking_message' && !event.isComplete,
        };

        if (thinkingDuration !== undefined) {
          updatedMessage.thinkingDuration = thinkingDuration;
        }

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, existingMessageIndex),
            updatedMessage,
            ...sessionMessages.slice(existingMessageIndex + 1),
          ],
        };
      } else {
        const newMessage: Message = {
          id: event.id || uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: event.timestamp,
          thinking: event.content.startsWith(NEWLINE_CHAR)
            ? event.content.replace(LEADING_NEWLINES_REGEX, '')
            : event.content,
          messageId: eventMessageId,
          isStreaming: event.type === 'assistant_streaming_thinking_message' && !event.isComplete,
        };

        if (thinkingDuration !== undefined) {
          newMessage.thinkingDuration = thinkingDuration;
        }

        return {
          ...prev,
          [sessionId]: [...sessionMessages, newMessage],
        };
      }
    });
  }
}
