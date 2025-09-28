import { isProcessingAtom } from '@/common/state/atoms/ui';
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

    // Update processing state
    if (shouldUpdateProcessingState(sessionId)) {
      set(isProcessingAtom, true);
    }
  }
}

export class AgentRunEndHandler implements EventHandler<AgentEventStream.Event> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.Event {
    return event.type === 'agent_run_end';
  }

  handle(context: EventHandlerContext, sessionId: string, event: AgentEventStream.Event): void {
    const { set } = context;

    // Update processing state
    if (shouldUpdateProcessingState(sessionId)) {
      set(isProcessingAtom, false);
    }
  }
}
