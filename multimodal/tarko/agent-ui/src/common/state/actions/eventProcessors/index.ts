import { atom } from 'jotai';
import { EventProcessingParams, EventHandlerContext } from './types';
import { eventHandlerRegistry } from './EventHandlerRegistry';
import { replayStateAtom } from '@/common/state/atoms/replay';
import { BatchEventProcessor } from './batchProcessor';
import { AgentEventStream } from '@/common/types';
import { PerformanceMonitor } from '@/common/utils/performanceMonitor';

/**
 * Main event processor action - maintains the original API
 */
export const processEventAction = atom(null, async (get, set, params: EventProcessingParams) => {
  const { sessionId, event } = params;

  // Create handler context
  const context: EventHandlerContext = { get, set };

  // Get replay state to pass to handlers if needed
  const replayState = get(replayStateAtom);
  const isReplayMode = replayState?.isActive || false;

  // Skip streaming events in replay mode
  if (isReplayMode) {
    const skipInReplay = [
      'assistant_streaming_message',
      'assistant_streaming_thinking_message', 
      'assistant_streaming_tool_call',
      'final_answer_streaming',
    ] as const;

    if (skipInReplay.includes(event.type as any)) {
      return;
    }
  }

  // Find and execute appropriate handler with performance monitoring
  const handler = eventHandlerRegistry.findHandler(event);

  if (handler) {
    const endMeasurement = PerformanceMonitor.startMeasurement(`event.${event.type}`);
    try {
      await handler.handle(context, sessionId, event);
    } catch (error) {
      console.error(`Error handling event ${event.type}:`, error);
      // Continue processing to avoid breaking the event stream
    } finally {
      endMeasurement();
    }
  } else {
    console.warn(`No handler found for event type: ${event.type}`);
  }
});

/**
 * Batch event processor action for improved performance when loading large event streams
 */
export const processBatchEventsAction = atom(
  null,
  async (get, set, params: { sessionId: string; events: AgentEventStream.Event[] }) => {
    const { sessionId, events } = params;

    // Create handler context
    const context: EventHandlerContext = { get, set };

    // Optimize events for faster processing
    const endOptimization = PerformanceMonitor.startMeasurement('batch.optimization');
    const optimizedEvents = BatchEventProcessor.optimizeEvents(events);
    endOptimization();

    // Process events in batches
    const endBatchProcessing = PerformanceMonitor.startMeasurement('batch.processing');
    await BatchEventProcessor.processBatch(context, sessionId, optimizedEvents);
    endBatchProcessing();

    console.log(
      `Processed ${events.length} events (optimized to ${optimizedEvents.length}) for session ${sessionId}`,
    );
  },
);

// Re-export types for backward compatibility
export type { EventProcessingParams } from './types';
