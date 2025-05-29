import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiTool, FiImage, FiCpu } from 'react-icons/fi';
import { Event, EventType } from '../../types';
import { useReplay } from '../../hooks/useReplay';
import { formatTimestamp } from '../../utils/formatters';

/**
 * TimelineSlider - Interactive timeline for replay navigation
 *
 * Design principles:
 * - Elegant, minimal design with refined spacing
 * - Visual markers for important events
 * - Subtle hover interactions and animations
 * - Consistent with overall UI aesthetics
 */
export const TimelineSlider: React.FC = () => {
  const { replayState, jumpToPosition, getCurrentPosition, getCurrentEvent } = useReplay();

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverEvent, setHoverEvent] = useState<Event | null>(null);

  const { events } = replayState;
  const currentPosition = getCurrentPosition();
  const currentEvent = getCurrentEvent();

  // Handle mouse down on slider
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;

    setIsDragging(true);
    updatePositionFromMouse(e);
  };

  // Handle mouse move for dragging and hover feedback
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;

    // Update hover position and event
    const rect = sliderRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    setHoverPosition(position);

    // Find event closest to hover position
    if (events.length > 0) {
      const index = Math.floor(position * events.length);
      const boundedIndex = Math.max(0, Math.min(index, events.length - 1));
      setHoverEvent(events[boundedIndex]);
    }

    // Update position if dragging
    if (isDragging) {
      updatePositionFromMouse(e);
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate position from mouse event
  const updatePositionFromMouse = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    jumpToPosition(position);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverPosition(null);
    setHoverEvent(null);
    setIsDragging(false);
  };

  // Add global mouse up handler when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  // Get icon for event type
  const getEventIcon = (event: Event) => {
    switch (event.type) {
      case EventType.USER_MESSAGE:
      case EventType.ASSISTANT_MESSAGE:
      case EventType.ASSISTANT_STREAMING_MESSAGE:
        return <FiMessageSquare size={12} className="text-gray-600 dark:text-gray-400" />;
      case EventType.TOOL_CALL:
      case EventType.TOOL_RESULT:
        return <FiTool size={12} className="text-gray-600 dark:text-gray-400" />;
      case EventType.ENVIRONMENT_INPUT:
        return <FiImage size={12} className="text-gray-600 dark:text-gray-400" />;
      case EventType.PLAN_UPDATE:
      case EventType.PLAN_FINISH:
        return <FiCpu size={12} className="text-gray-600 dark:text-gray-400" />;
      default:
        return null;
    }
  };

  // Determine color for event marker
  const getEventColor = (event: Event) => {
    switch (event.type) {
      case EventType.USER_MESSAGE:
        return 'bg-gray-900 dark:bg-gray-100';
      case EventType.ASSISTANT_MESSAGE:
      case EventType.ASSISTANT_STREAMING_MESSAGE:
        return 'bg-accent-500 dark:bg-accent-400';
      case EventType.TOOL_CALL:
      case EventType.TOOL_RESULT:
        return 'bg-green-500 dark:bg-green-400';
      case EventType.ENVIRONMENT_INPUT:
        return 'bg-blue-500 dark:bg-blue-400';
      default:
        return 'bg-gray-400 dark:bg-gray-500';
    }
  };

  // Get event description for hover tooltip
  const getEventDescription = (event: Event) => {
    switch (event.type) {
      case EventType.USER_MESSAGE:
        return 'User Message';
      case EventType.ASSISTANT_MESSAGE:
        return 'Assistant Response';
      case EventType.ASSISTANT_STREAMING_MESSAGE:
        return 'Assistant Typing';
      case EventType.TOOL_CALL:
        return `Tool Call: ${(event as any).name || ''}`;
      case EventType.TOOL_RESULT:
        return `Tool Result: ${(event as any).name || ''}`;
      case EventType.ENVIRONMENT_INPUT:
        return 'Environment Input';
      case EventType.PLAN_UPDATE:
        return 'Plan Update';
      case EventType.PLAN_FINISH:
        return 'Plan Completed';
      default:
        return event.type;
    }
  };

  // Filter events to only show significant markers (avoid cluttering timeline)
  const getSignificantEvents = () => {
    if (!events.length) return [];

    // Keep main events and filter out streaming messages except for first of each group
    const filteredEvents: Event[] = [];
    let lastMessageId: string | undefined;

    events.forEach((event) => {
      // Always keep these events
      if (
        event.type === EventType.USER_MESSAGE ||
        event.type === EventType.ASSISTANT_MESSAGE ||
        event.type === EventType.TOOL_CALL ||
        event.type === EventType.TOOL_RESULT ||
        event.type === EventType.ENVIRONMENT_INPUT ||
        event.type === EventType.PLAN_FINISH ||
        event.type === EventType.FINAL_ANSWER
      ) {
        filteredEvents.push(event);
      }

      // For streaming messages, only keep first of each messageId group
      else if (event.type === EventType.ASSISTANT_STREAMING_MESSAGE) {
        const messageId = event.messageId;
        if (messageId !== lastMessageId) {
          filteredEvents.push(event);
          lastMessageId = messageId;
        }
      }

      // For streaming messages, only keep first of each messageId group
      else if (event.type === EventType.FINAL_ANSWER_STREAMING) {
        const messageId = event.messageId;
        if (messageId !== lastMessageId) {
          filteredEvents.push(event);
          lastMessageId = messageId;
        }
      }
    });

    return filteredEvents;
  };

  const significantEvents = getSignificantEvents();

  return (
    <div className="px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30 shadow-sm">
      <div className="relative">
        {/* Timeline slider */}
        <div
          ref={sliderRef}
          className="relative h-6 cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Track background */}
          <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />

          {/* Progress fill */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-accent-500 dark:bg-accent-400 rounded-full"
            style={{ width: `${currentPosition}%` }}
          />

          {/* Event markers */}
          {significantEvents.map((event, index) => {
            const position = (index / (events.length - 1)) * 100;
            return (
              <div
                key={`${event.id}-${index}`}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                style={{ left: `${position}%` }}
              >
                <div className={`w-1 h-1 rounded-full ${getEventColor(event)}`} />
              </div>
            );
          })}

          {/* Playhead */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-gray-200 border-2 border-accent-500 dark:border-accent-400 shadow-sm"
            style={{ left: `calc(${currentPosition}% - 6px)` }}
            animate={{ scale: isDragging ? 1.2 : 1 }}
            transition={{ duration: 0.2 }}
          />

          {/* Hover position indicator */}
          {hoverPosition !== null && !isDragging && (
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400/30 dark:bg-gray-500/30"
              style={{ left: `${hoverPosition * 100}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>

        {/* Hover tooltip */}
        {hoverEvent && hoverPosition !== null && (
          <motion.div
            className="absolute bottom-full mb-2 px-2 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/30 text-xs whitespace-nowrap"
            style={{
              left: `${hoverPosition * 100}%`,
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-1">
              {getEventIcon(hoverEvent)}
              <span className="font-medium">{getEventDescription(hoverEvent)}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                {formatTimestamp(hoverEvent.timestamp)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Current event info */}
        {currentEvent && (
          <div className="mt-1 px-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              {getEventIcon(currentEvent)}
              <span>{getEventDescription(currentEvent)}</span>
            </div>
            <span>{formatTimestamp(currentEvent.timestamp)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
