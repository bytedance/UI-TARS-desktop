import { atom } from 'jotai';
import { EventProcessingParams, EventHandlerContext } from './types';
import { eventHandlerRegistry } from './EventHandlerRegistry';
import { replayStateAtom } from '@/common/state/atoms/replay';

/**
 * Main event processor action - maintains the original API
 */
export const processEventAction = atom(null, async (get, set, params: EventProcessingParams) => {
  const { sessionId, event } = params;

  // Create handler context
  const context: EventHandlerContext = { get, set };

  // Get replay state to pass to handlers if needed
  const replayState = get(replayStateAtom);
  const isReplayMode = replayState.isActive;

  // Skip streaming events in replay mode (except for specific types)
  if (isReplayMode) {
    const skipInReplay = [
      'assistant_streaming_message',
      'assistant_streaming_thinking_message',
      'assistant_streaming_tool_call',
      'final_answer_streaming',
    ];

    if (skipInReplay.includes(event.type)) {
      return;
    }
  }

  // Find and execute appropriate handler
  const handler = eventHandlerRegistry.findHandler(event);

  if (handler) {
    try {
      await handler.handle(context, sessionId, event);
    } catch (error) {
      console.error(`Error handling event ${event.type}:`, error);
      // Continue processing to avoid breaking the event stream
    }
  } else {
    console.warn(`No handler found for event type: ${event.type}`);
  }
});

// Re-export types for backward compatibility
export type { EventProcessingParams } from './types';
