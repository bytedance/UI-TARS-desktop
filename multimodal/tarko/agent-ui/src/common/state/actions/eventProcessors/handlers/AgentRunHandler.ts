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
      // Only update local state with metadata from events
      // Don't overwrite existing user selections in the atom
      set(sessionMetadataAtom, (prev) => {
        const updated = { ...prev };
        
        // Only set modelConfig if no existing modelConfig in state
        // This preserves user's model selection
        if (!prev.modelConfig && metadataUpdates.modelConfig) {
          updated.modelConfig = metadataUpdates.modelConfig;
        }
        
        // Always update agentInfo as it's session-specific
        if (metadataUpdates.agentInfo) {
          updated.agentInfo = metadataUpdates.agentInfo;
        }
        
        return updated;
      });

      // Only persist to server for real-time events (within last 10 seconds)
      // Don't persist historical events during session restoration
      const isRealtimeEvent = Date.now() - event.timestamp < 10000;
      
      if (isRealtimeEvent) {
        try {
          // Get current session details to merge with existing metadata
          const sessionDetails = await apiService.getSessionDetails(sessionId);
          const existingMetadata = sessionDetails.metadata || {};
          
          // Only update fields that don't already exist in storage
          const mergedMetadata = { ...existingMetadata };
          
          // Don't overwrite existing modelConfig - user's choice takes precedence
          if (!existingMetadata.modelConfig && metadataUpdates.modelConfig) {
            mergedMetadata.modelConfig = metadataUpdates.modelConfig;
          }
          
          // Always update agentInfo for new runs
          if (metadataUpdates.agentInfo) {
            mergedMetadata.agentInfo = metadataUpdates.agentInfo;
          }
          
          await apiService.updateSessionInfo(sessionId, {
            metadata: mergedMetadata,
          });
          
          console.log('Persisted realtime session metadata:', mergedMetadata);
        } catch (error) {
          console.warn('Failed to persist session metadata:', error);
        }
      } else {
        console.log('Skipped persisting historical event metadata (preserving user choices):', metadataUpdates);
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
