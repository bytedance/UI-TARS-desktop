import { v4 as uuidv4 } from 'uuid';
import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream, Message } from '@/common/types';
import { messagesAtom } from '@/common/state/atoms/message';
import { sessionPanelContentAtom } from '@/common/state/atoms/ui';
import { shouldUpdatePanelContent } from '../utils/panelContentUpdater';
import { ChatCompletionContentPartImage } from '@tarko/agent-interface';

export class SystemMessageHandler implements EventHandler<AgentEventStream.SystemEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.SystemEvent {
    return event.type === 'system';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.SystemEvent,
  ): void {
    const { set } = context;

    const systemMessage: Message = {
      id: event.id || uuidv4(),
      role: 'system',
      content: event.message,
      timestamp: event.timestamp || Date.now(),
      level: event.level,
      details: event.details,
    };

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionMessages, systemMessage],
      };
    });
  }
}

export class EnvironmentInputHandler
  implements EventHandler<AgentEventStream.EnvironmentInputEvent>
{
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.EnvironmentInputEvent {
    return event.type === 'environment_input';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.EnvironmentInputEvent,
  ): void {
    const { get, set } = context;

    // Check if this is the first environment_input event BEFORE adding the current message
    const existingSessionMessages = get(messagesAtom)[sessionId] || [];
    const isFirstEnvironmentInput =
      existingSessionMessages.filter((msg) => msg.role === 'environment').length === 0;

    const environmentMessage: Message = {
      id: event.id,
      role: 'environment',
      content: event.content,
      timestamp: event.timestamp,
      description: event.description || 'Environment Input',
      metadata: event.metadata,
    };

    set(messagesAtom, (prev: Record<string, Message[]>) => {
      const sessionMessages = prev[sessionId] || [];
      return {
        ...prev,
        [sessionId]: [...sessionMessages, environmentMessage],
      };
    });

    if (Array.isArray(event.content)) {
      const imageContent = event.content.find(
        (item): item is ChatCompletionContentPartImage =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          item.type === 'image_url' &&
          'image_url' in item &&
          typeof item.image_url === 'object' &&
          item.image_url !== null &&
          'url' in item.image_url,
      );

      if (imageContent && imageContent.image_url) {
        const currentPanelContent = get(sessionPanelContentAtom);
        const currentSessionPanel = currentPanelContent[sessionId];

        // Always show first environment_input (initialization screenshot) or update existing browser_vision_control panel
        // For session creation, we bypass the shouldUpdatePanelContent check for first environment_input
        const shouldUpdate =
          isFirstEnvironmentInput ||
          (currentSessionPanel && currentSessionPanel.type === 'browser_vision_control') ||
          shouldUpdatePanelContent(get, sessionId);

        console.log('EnvironmentInputHandler debug:', {
          sessionId,
          isFirstEnvironmentInput,
          currentSessionPanel,
          shouldUpdate,
          eventId: event.id
        });

        if (
          shouldUpdate &&
          (isFirstEnvironmentInput ||
            (currentSessionPanel && currentSessionPanel.type === 'browser_vision_control'))
        ) {
          console.log('Setting sessionPanelContentAtom for session:', sessionId);
          set(sessionPanelContentAtom, (prev) => ({
            ...prev,
            [sessionId]: {
              type: 'browser_vision_control',
              source: null,
              title: event.description || 'Browser Screenshot',
              timestamp: event.timestamp,
              originalContent: event.content,
              environmentId: event.id,
              arguments: {
                // Browser control data - can be empty for environment screenshots
                thought: undefined,
                step: undefined,
                action: undefined,
                status: undefined,
              },
              _extra: {
                currentScreenshot: imageContent.image_url.url,
              },
            },
          }));
        } else {
          console.log('Not setting sessionPanelContentAtom, conditions not met:', {
            shouldUpdate,
            isFirstEnvironmentInput,
            currentSessionPanel: !!currentSessionPanel
          });
        }
        // Skip update for other panel types to avoid duplicate Browser Screenshot rendering
      }
    }
  }
}
