import { isProcessingAtom } from '@/common/state/atoms/ui';
import { activeSessionIdAtom } from '@/common/state/atoms/session';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';

export class AgentRunStartHandler implements EventHandler<AgentEventStream.AgentRunStartEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.AgentRunStartEvent {
    return event.type === 'agent_run_start';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AgentRunStartEvent,
  ): void {
    const { get, set } = context;
    
    // Only update processing state for the active session
    const activeSessionId = get(activeSessionIdAtom);
    if (sessionId === activeSessionId) {
      set(isProcessingAtom, true);
    }
  }
}

export class AgentRunEndHandler implements EventHandler<AgentEventStream.Event> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.Event {
    return event.type === 'agent_run_end';
  }

  handle(context: EventHandlerContext, sessionId: string, event: AgentEventStream.Event): void {
    const { get, set } = context;
    
    // Only update processing state for the active session
    const activeSessionId = get(activeSessionIdAtom);
    if (sessionId === activeSessionId) {
      set(isProcessingAtom, false);
    }
  }
}
