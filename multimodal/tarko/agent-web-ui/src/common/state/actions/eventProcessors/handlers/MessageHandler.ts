import { v4 as uuidv4 } from 'uuid';
import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { activePanelContentAtom, isProcessingAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';
import { ChatCompletionContentPartImage } from '@tarko/agent-interface';

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

    const userMessage: Message = {
      id: event.id,
      role: 'user',
      content: event.content,
      timestamp: event.timestamp,
    };

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
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
        set(activePanelContentAtom, {
          type: 'image',
          source: images[0].image_url.url,
          title: 'User Upload',
          timestamp: Date.now(),
        });
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
            elapsedMs: event.elapsedMs,
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
            elapsedMs: event.elapsedMs,
          },
        ],
      };
    });

    if (event.finishReason !== 'tool_calls' && shouldUpdatePanelContent(get, sessionId)) {
      // Auto-associate with recent environment input for final browser state display
      const currentMessages = get(messagesAtom)[sessionId] || [];

      for (let i = currentMessages.length - 1; i >= 0; i--) {
        const msg = currentMessages[i];
        if (msg.role === 'environment' && Array.isArray(msg.content)) {
          const imageContent = msg.content.find(
            (item): item is ChatCompletionContentPartImage =>
              typeof item === 'object' &&
              item !== null &&
              'type' in item &&
              item.type === 'image_url' &&
              'image_url' in item &&
              typeof item.image_url === 'object' &&
              item.image_url !== null &&
              'url' in item.image_url,
          );

          if (imageContent && imageContent.image_url) {
            set(activePanelContentAtom, {
              type: 'image',
              source: msg.content,
              title: msg.description || 'Final Browser State',
              timestamp: msg.timestamp,
              environmentId: msg.id,
            });
            break;
          }
        }
      }
    }

    set(isProcessingAtom, false);
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

    if (event.isComplete) {
      set(isProcessingAtom, false);
    }
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

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      const lastAssistantIndex = [...sessionMessages]
        .reverse()
        .findIndex((m) => m.role === 'assistant');

      if (lastAssistantIndex !== -1) {
        const actualIndex = sessionMessages.length - 1 - lastAssistantIndex;
        const message = sessionMessages[actualIndex];

        return {
          ...prev,
          [sessionId]: [
            ...sessionMessages.slice(0, actualIndex),
            { ...message, thinking: event.content },
            ...sessionMessages.slice(actualIndex + 1),
          ],
        };
      }

      return prev;
    });
  }
}
