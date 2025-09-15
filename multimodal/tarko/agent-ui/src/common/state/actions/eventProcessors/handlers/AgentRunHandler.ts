import { sessionAgentStatusAtom } from '@/common/state/atoms/ui';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';
import { shouldUpdateProcessingState } from '../utils/panelContentUpdater';

export class AgentRunStartHandler implements EventHandler<AgentEventStream.AgentRunStartEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.AgentRunStartEvent {
    return event.type === 'agent_run_start';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AgentRunStartEvent,
  ): void {
    const { set } = context;

    // Update processing state for the specific session
    // Note: agentInfo and modelConfig are now set during session creation on server side
    if (shouldUpdateProcessingState(sessionId)) {
      set(sessionAgentStatusAtom, (prev) => ({
        ...prev,
        [sessionId]: {
          ...(prev[sessionId] || {}),
          isProcessing: true,
        },
      }));
    }
  }
}

export class AgentRunEndHandler implements EventHandler<AgentEventStream.Event> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.Event {
    return event.type === 'agent_run_end';
  }

  handle(context: EventHandlerContext, sessionId: string, event: AgentEventStream.Event): void {
    const { set } = context;

    // Update processing state for the specific session
    if (shouldUpdateProcessingState(sessionId)) {
      set(sessionAgentStatusAtom, (prev) => ({
        ...prev,
        [sessionId]: {
          ...(prev[sessionId] || {}),
          isProcessing: false,
        },
      }));
    }
  }
}
