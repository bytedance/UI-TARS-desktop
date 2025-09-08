import { sessionAgentStatusAtom, sessionMetadataAtom } from '@/common/state/atoms/ui';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';
import { apiService } from '@/common/services/apiService';
import { SessionInfo } from '@tarko/interface';
import { createModelConfigFromEvent, createAgentInfoFromEvent } from '@/common/utils/metadataUtils';
import { shouldUpdateProcessingState } from '../utils/panelContentUpdater';

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
    const metadataUpdates: Partial<NonNullable<SessionInfo['metadata']>> = {};
    const modelConfig = createModelConfigFromEvent(event);
    if (modelConfig) {
      metadataUpdates.modelConfig = modelConfig;
    }

    const agentInfo = createAgentInfoFromEvent(event);
    if (agentInfo) {
      metadataUpdates.agentInfo = agentInfo;
    }

    if (Object.keys(metadataUpdates).length > 0) {
      set(sessionMetadataAtom, (prev) => ({
        ...prev,
        ...metadataUpdates,
      }));

      // Persist to server
      try {
        await apiService.updateSessionInfo(sessionId, {
          metadata: metadataUpdates,
        });
      } catch (error) {
        console.warn('Failed to persist session metadata:', error);
      }
    }

    // Update processing state for the specific session
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
