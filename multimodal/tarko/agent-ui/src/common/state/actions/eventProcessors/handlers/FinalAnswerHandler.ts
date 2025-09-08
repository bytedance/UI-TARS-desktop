import { v4 as uuidv4 } from 'uuid';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { activePanelContentAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';
import { EventHandler, EventHandlerContext } from '../types';

export class FinalAnswerHandler implements EventHandler<AgentEventStream.FinalAnswerEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.FinalAnswerEvent {
    return event.type === 'final_answer';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.FinalAnswerEvent,
  ): void {
    const { get, set } = context;
    const messageId = event.messageId || `final-answer-${uuidv4()}`;

    // Update panel content only for active session
    if (shouldUpdatePanelContent(get, sessionId)) {
      set(activePanelContentAtom, {
        type: 'research_report',
        source: event.content,
        title: event.title || 'Research Report',
        timestamp: event.timestamp,
        isDeepResearch: true,
        messageId,
      });
    }

    const finalAnswerMessage: Message = {
      id: event.id || uuidv4(),
      role: 'final_answer',
      content: event.content,
      timestamp: event.timestamp,
      messageId,
      isDeepResearch: true,
      title: event.title || 'Research Report',
    };

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionMessages, finalAnswerMessage],
      };
    });


  }
}

export class FinalAnswerStreamingHandler
  implements
    EventHandler<
      AgentEventStream.Event & {
        content: string;
        isDeepResearch: boolean;
        isComplete?: boolean;
        messageId?: string;
        title?: string;
      }
    >
{
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.Event & {
    content: string;
    isDeepResearch: boolean;
    isComplete?: boolean;
    messageId?: string;
    title?: string;
  } {
    return (
      event.type === 'final_answer_streaming' && 'content' in event && 'isDeepResearch' in event
    );
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.Event & {
      content: string;
      isDeepResearch: boolean;
      isComplete?: boolean;
      messageId?: string;
      title?: string;
    },
  ): void {
    const { get, set } = context;
    const messageId = event.messageId || `final-answer-${uuidv4()}`;

    const messages = get(messagesAtom)[sessionId] || [];
    const existingMessageIndex = messages.findIndex((msg) => msg.messageId === messageId);

    // Append content to existing message or create new one for streaming
    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];

      if (existingMessageIndex >= 0) {
        const existingMessage = sessionMessages[existingMessageIndex];
        const updatedMessage = {
          ...existingMessage,
          content:
            typeof existingMessage.content === 'string'
              ? existingMessage.content + event.content
              : event.content,
          isStreaming: !event.isComplete,
          timestamp: event.timestamp,
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
        role: 'final_answer',
        content: event.content,
        timestamp: event.timestamp,
        messageId,
        isDeepResearch: true,
        isStreaming: !event.isComplete,
        title: event.title || 'Research Report',
      };

      return {
        ...prev,
        [sessionId]: [...sessionMessages, newMessage],
      };
    });

    // Sync panel content with message state (only for active session)
    if (shouldUpdatePanelContent(get, sessionId)) {
      set(activePanelContentAtom, (prev) => {
        // Start new stream or different messageId
        if (!prev || prev.type !== 'research_report' || prev.messageId !== messageId) {
          return {
            type: 'research_report',
            source: event.content,
            title: event.title || 'Research Report (Generating...)',
            timestamp: event.timestamp,
            isDeepResearch: true,
            messageId,
            isStreaming: !event.isComplete,
          };
        }

        // Append to existing content
        return {
          ...prev,
          source: (typeof prev.source === 'string' ? prev.source : '') + event.content,
          isStreaming: !event.isComplete,
          timestamp: event.timestamp,
          title: event.title || prev.title,
        };
      });
    }

    // Handle first chunk and completion state
    const prevActivePanelContent = get(activePanelContentAtom);
    if (!prevActivePanelContent || prevActivePanelContent.messageId !== messageId) {
      const initialMessage: Message = {
        id: event.id || uuidv4(),
        role: 'final_answer',
        content: event.content,
        timestamp: event.timestamp,
        messageId,
        isDeepResearch: true,
        isStreaming: !event.isComplete,
        title: event.title || 'Research Report',
      };

      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        return {
          ...prev,
          [sessionId]: [...sessionMessages, initialMessage],
        };
      });
    } else if (event.isComplete) {
      // Update with complete content when streaming finishes
      const fullContent = get(activePanelContentAtom)?.source;

      set(messagesAtom, (prev: Record<string, Message[]>) => {
        const sessionMessages = prev[sessionId] || [];
        const messageIndex = sessionMessages.findIndex((msg) => msg.messageId === messageId);

        if (messageIndex >= 0) {
          const updatedMessages = [...sessionMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content:
              typeof fullContent === 'string' ? fullContent : updatedMessages[messageIndex].content,
            isStreaming: false,
            title: event.title || updatedMessages[messageIndex].title || 'Research Report',
          };

          return {
            ...prev,
            [sessionId]: updatedMessages,
          };
        }

        return prev;
      });
    }


  }
}
