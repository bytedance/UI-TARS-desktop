import { EventHandler, EventHandlerContext } from '../types';
import { rawEventsAtom } from '@/common/state/atoms/rawEvents';
import { AgentEventStream } from '@/common/types';

/**
 * Handler for storing all raw events in the rawEventsAtom
 * This enables the Event Stream Viewer to show real-time events
 */
export class RawEventsHandler implements EventHandler {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.Event {
    // Handle all event types
    return true;
  }

  async handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.Event,
  ): Promise<void> {
    const { get, set } = context;

    // Get current raw events
    const currentRawEvents = get(rawEventsAtom);

    // Initialize session events if not exists
    const sessionEvents = currentRawEvents[sessionId] || [];

    // Add new event to the session
    const updatedSessionEvents = [...sessionEvents, event];

    // Update the atom with new events
    set(rawEventsAtom, {
      ...currentRawEvents,
      [sessionId]: updatedSessionEvents,
    });

    console.log(`[RawEventsHandler] Added ${event.type} event to session ${sessionId}`);
  }
}
