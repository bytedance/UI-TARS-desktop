import { atom } from 'jotai';
import { EventProcessingParams, EventHandlerContext } from './types';
import { eventHandlerRegistry } from './EventHandlerRegistry';
import { replayStateAtom } from '@/common/state/atoms/replay';

export const processEventAction = atom(null, async (get, set, params: EventProcessingParams) => {
  const { sessionId, event } = params;

  const context: EventHandlerContext = { get, set };

  const replayState = get(replayStateAtom);
  const isReplayMode = replayState.isActive;

  if (isReplayMode) {
    const skipInReplay = [
      'assistant_streaming_message',
      'assistant_streaming_thinking_message',
      'assistant_streaming_tool_call',
    ];

    if (skipInReplay.includes(event.type)) {
      return;
    }
  }

  // Find and execute all appropriate handlers
  const handlers = eventHandlerRegistry.findAllHandlers(event);

  if (handlers.length > 0) {
    // Execute all handlers in parallel
    const handlerPromises = handlers.map(async (handler) => {
      try {
        await handler.handle(context, sessionId, event);
      } catch (error) {
        console.error(`Error in handler for event ${event.type}:`, error);
        // Continue processing to avoid breaking the event stream
      }
    });

    await Promise.all(handlerPromises);
  } else {
    console.warn(`No handler found for event type: ${event.type}`);
  }
});

export type { EventProcessingParams } from './types';
