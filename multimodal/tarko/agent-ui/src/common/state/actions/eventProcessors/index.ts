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
      'final_answer_streaming',
    ];

    if (skipInReplay.includes(event.type)) {
      return;
    }
  }

  const handler = eventHandlerRegistry.findHandler(event);

  if (handler) {
    try {
      await handler.handle(context, sessionId, event);
    } catch (error) {
      console.error(`Error handling event ${event.type}:`, error);
    }
  } else {
    console.warn(`No handler found for event type: ${event.type}`);
  }
});

export type { EventProcessingParams } from './types';
