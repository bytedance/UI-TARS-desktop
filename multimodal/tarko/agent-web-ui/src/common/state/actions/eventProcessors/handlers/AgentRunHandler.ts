import { isProcessingAtom, modelInfoAtom } from '@/common/state/atoms/ui';
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
    const { set } = context;

    if (event.provider || event.model) {
      set(modelInfoAtom, {
        provider: event.provider || '',
        model: event.model || '',
        displayName: event.modelDisplayName,
      });
    }
    set(isProcessingAtom, true);
  }
}

export class AgentRunEndHandler implements EventHandler<AgentEventStream.Event> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.Event {
    return event.type === 'agent_run_end';
  }

  handle(context: EventHandlerContext, sessionId: string, event: AgentEventStream.Event): void {
    const { set } = context;
    set(isProcessingAtom, false);
  }
}
