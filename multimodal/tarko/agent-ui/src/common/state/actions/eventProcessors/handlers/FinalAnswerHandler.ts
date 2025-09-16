import { v4 as uuidv4 } from 'uuid';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { activePanelContentAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';
import { EventHandler, EventHandlerContext } from '../types';
import { MessageUpdater } from '../utils/messageUpdater';

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
    const updater = new MessageUpdater(set);

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

    updater.addMessage(sessionId, {
      id: event.id || uuidv4(),
      role: 'final_answer',
      content: event.content,
      timestamp: event.timestamp,
      messageId,
      isDeepResearch: true,
      title: event.title || 'Research Report',
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
    const updater = new MessageUpdater(set);

    // Handle streaming message updates
    updater.appendStreamingContent(
      sessionId,
      messageId,
      event.content,
      event.isComplete,
      {
        id: event.id || uuidv4(),
        role: 'final_answer' as const,
        timestamp: event.timestamp,
        messageId,
        isDeepResearch: true,
        title: event.title || 'Research Report',
      },
    );

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
  }
}
