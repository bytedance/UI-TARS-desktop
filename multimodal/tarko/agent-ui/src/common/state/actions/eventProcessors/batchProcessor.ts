import { EventHandlerContext } from './types';
import { eventHandlerRegistry } from './EventHandlerRegistry';
import { AgentEventStream } from '@/common/types';
import { replayStateAtom } from '@/common/state/atoms/replay';

// Constants for event filtering and processing
const SKIP_IN_REPLAY_EVENTS = [
  'assistant_streaming_message',
  'assistant_streaming_thinking_message', 
  'assistant_streaming_tool_call',
  'final_answer_streaming',
] as const;

const STREAMING_EVENT_TYPES = [
  'assistant_streaming_message',
  'assistant_streaming_thinking_message',
  'assistant_streaming_tool_call', 
  'final_answer_streaming',
] as const;

/**
 * Batch event processor for improved performance when loading large event streams
 */
export class BatchEventProcessor {
  private static readonly BATCH_SIZE = 50;
  private static readonly BATCH_DELAY = 0;

  /**
   * Process events in batches to avoid blocking the main thread
   */
  static async processBatch(
    context: EventHandlerContext,
    sessionId: string,
    events: AgentEventStream.Event[],
  ): Promise<void> {
    const { get } = context;
    const replayState = get(replayStateAtom);
    const isReplayMode = replayState?.isActive || false;

    const filteredEvents = isReplayMode
      ? events.filter((event) => !SKIP_IN_REPLAY_EVENTS.includes(event.type as any))
      : events;

    // Process events in batches
    for (let i = 0; i < filteredEvents.length; i += this.BATCH_SIZE) {
      const batch = filteredEvents.slice(i, i + this.BATCH_SIZE);

      // Process batch synchronously for better performance
      for (const event of batch) {
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
      }

      // Yield control to the main thread between batches
      if (i + this.BATCH_SIZE < filteredEvents.length) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY));
      }
    }
  }

  /**
   * Optimize events for faster processing by grouping and deduplicating
   */
  static optimizeEvents(events: AgentEventStream.Event[]): AgentEventStream.Event[] {
    // Group streaming events by messageId to reduce redundant processing
    const messageStreams: Map<string, AgentEventStream.Event[]> = new Map();
    const nonStreamingEvents: AgentEventStream.Event[] = [];

    for (const event of events) {
      if (this.isStreamingEvent(event) && 'messageId' in event && event.messageId) {
        const messageId = event.messageId as string;
        if (!messageStreams.has(messageId)) {
          messageStreams.set(messageId, []);
        }
        messageStreams.get(messageId)!.push(event);
      } else {
        nonStreamingEvents.push(event);
      }
    }

    // Consolidate streaming events to final states
    const consolidatedStreamingEvents: AgentEventStream.Event[] = [];
    for (const [messageId, streamEvents] of Array.from(messageStreams.entries())) {
      const consolidated = this.consolidateStreamingEvents(streamEvents);
      if (consolidated) {
        consolidatedStreamingEvents.push(consolidated);
      }
    }

    // Merge and sort by timestamp
    const allEvents = [...nonStreamingEvents, ...consolidatedStreamingEvents];
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  private static isStreamingEvent(event: AgentEventStream.Event): boolean {
    return STREAMING_EVENT_TYPES.includes(event.type as any);
  }

  private static consolidateStreamingEvents(
    events: AgentEventStream.Event[],
  ): AgentEventStream.Event | null {
    if (events.length === 0) return null;

    // Sort by timestamp to ensure correct order
    events.sort((a, b) => a.timestamp - b.timestamp);

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    // For streaming messages, create a final consolidated event
    if (firstEvent.type === 'assistant_streaming_message') {
      const content = events
        .map((e) => {
          const streamingEvent = e as AgentEventStream.AssistantStreamingMessageEvent;
          return streamingEvent.content || '';
        })
        .join('');

      return {
        ...lastEvent,
        type: 'assistant_message',
        content,
      } as AgentEventStream.Event;
    }

    // For other streaming types, return the last event
    return lastEvent;
  }
}
