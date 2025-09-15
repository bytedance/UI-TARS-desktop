import { sessionAgentStatusAtom, sessionMetadataAtom } from '@/common/state/atoms/ui';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';
import { apiService } from '@/common/services/apiService';
import { SessionInfo } from '@tarko/interface';
import { createAgentInfoFromEvent } from '@/common/utils/metadataUtils';
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

    // Extract agent info from event (agentInfo is always safe to update)
    const agentInfo = createAgentInfoFromEvent(event);
    
    if (agentInfo) {
      // Only update agentInfo - NEVER update modelConfig from events
      // modelConfig should only be updated through explicit user actions
      set(sessionMetadataAtom, (prev) => ({
        ...prev,
        agentInfo,
      }));

      // Only persist agentInfo to server for real-time events
      const isRealtimeEvent = Date.now() - event.timestamp < 10000;
      
      if (isRealtimeEvent) {
        try {
          // Get current session details to preserve existing modelConfig
          const sessionDetails = await apiService.getSessionDetails(sessionId);
          const existingMetadata = sessionDetails.metadata || {};
          
          // Preserve existing modelConfig, only update agentInfo
          const mergedMetadata = {
            ...existingMetadata,
            agentInfo, // Always update agentInfo for new runs
            // modelConfig is deliberately NOT updated here - user choice is preserved
          };
          
          await apiService.updateSessionInfo(sessionId, {
            metadata: mergedMetadata,
          });
          
          console.log('Persisted agentInfo from event (modelConfig preserved):', { agentInfo });
        } catch (error) {
          console.warn('Failed to persist session metadata:', error);
        }
      } else {
        console.log('Skipped persisting historical agentInfo (realtime only)');
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
