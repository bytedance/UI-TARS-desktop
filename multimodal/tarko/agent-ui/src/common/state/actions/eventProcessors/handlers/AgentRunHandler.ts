import { sessionAgentStatusAtom, sessionMetadataAtom } from '@/common/state/atoms/ui';
import { AgentEventStream } from '@/common/types';
import { EventHandler, EventHandlerContext } from '../types';
import { createAgentInfoFromEvent } from '@/common/utils/metadataUtils';
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

    // Extract agent info from event (agentInfo is always safe to update)
    const agentInfo = createAgentInfoFromEvent(event);
    
    if (agentInfo) {
      // Only update local state - NO persistence from event handlers
      // Event handlers should be pure state updaters, not data persisters
      set(sessionMetadataAtom, (prev) => ({
        ...prev,
        agentInfo,
      }));
      
      console.log('Updated agentInfo from event (local state only):', { agentInfo });
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
