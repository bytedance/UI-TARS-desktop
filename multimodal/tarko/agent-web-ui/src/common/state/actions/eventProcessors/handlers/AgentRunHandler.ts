import { isProcessingAtom, sessionMetadataAtom } from '@/common/state/atoms/ui';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';
import { apiService } from '@/common/services/apiService';
import { SessionItemInfo } from '@tarko/interface';

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

    // Update session metadata with model and agent info from event
    const metadataUpdates: Partial<NonNullable<SessionItemInfo['metadata']>> = {};
    
    if (event.provider || event.model) {
      metadataUpdates.modelConfig = {
        provider: event.provider || '',
        modelId: event.model || '',
        configuredAt: Date.now(),
      };
    }

    if (event.agentName) {
      metadataUpdates.agentInfo = {
        name: event.agentName,
        configuredAt: Date.now(),
      };
    }

    if (Object.keys(metadataUpdates).length > 0) {
      set(sessionMetadataAtom, (prev) => ({
        ...prev,
        ...metadataUpdates,
      }));

      // Persist to server
      try {
        await apiService.updateSessionItemInfo(sessionId, {
          metadata: metadataUpdates,
        });
      } catch (error) {
        console.warn('Failed to persist session metadata:', error);
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
