import { isProcessingAtom, sessionMetadataAtom } from '@/common/state/atoms/ui';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';
import { apiService } from '@/common/services/apiService';

export class AgentRunStartHandler implements EventHandler<AgentEventStream.AgentRunStartEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.AgentRunStartEvent {
    return event.type === 'agent_run_start';
  }

  async handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.AgentRunStartEvent,
  ): Promise<void> {
    const { set } = context;

    if (event.provider || event.model) {
      set(sessionMetadataAtom, (prev) => ({
        ...prev,
        model: {
          provider: event.provider || '',
          model: event.model || '',
          displayName: event.modelDisplayName,
        },
      }));
    }

    // FIXME: Migrate these codes to the server, no need to maintain them on the front-end 🤡
    // Capture and persist agent name in session metadata
    if (event.agentName) {
      set(sessionMetadataAtom, (prev) => ({
        ...prev,
        agent: { name: event.agentName },
      }));

      // Store agent info in session metadata for persistence
      try {
        await apiService.updateSessionItemInfo(sessionId, {
          metadata: {
            agentInfo: {
              name: event.agentName,
              configuredAt: Date.now(),
            },
          },
        });
      } catch (error) {
        console.warn('Failed to persist agent info in session metadata:', error);
      }
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
