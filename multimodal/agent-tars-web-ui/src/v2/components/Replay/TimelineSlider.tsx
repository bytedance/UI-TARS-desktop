import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiTool, FiImage, FiCpu, FiBookOpen } from 'react-icons/fi';
import { Event, EventType } from '../../types';
import { useReplay } from '../../hooks/useReplay';
import { formatTimestamp } from '../../utils/formatters';

/**
 * TimelineSlider - Interactive timeline for replay navigation
 *
 * Enhanced with:
 * - Monochromatic design matching the app's black/gray aesthetic
 * - Subtle markers with minimal visual noise
 * - No box shadows or gradients
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

  // Get color for event marker
  const getEventColor = (event: Event) => {
    switch (event.type) {
      case EventType.USER_MESSAGE:
        return 'bg-gray-400 dark:bg-gray-500';
      case EventType.ASSISTANT_MESSAGE:
        return 'bg-gray-600 dark:bg-gray-400';
      case EventType.TOOL_CALL:
      case EventType.TOOL_RESULT:
        return 'bg-gray-500 dark:bg-gray-400';
      case EventType.ENVIRONMENT_INPUT:
        return 'bg-gray-500 dark:bg-gray-400';
      case EventType.PLAN_UPDATE:
      case EventType.PLAN_FINISH:
        return 'bg-gray-500 dark:bg-gray-400';
      case EventType.FINAL_ANSWER:
        return 'bg-gray-700 dark:bg-gray-300';
      default:
        return 'bg-gray-400 dark:bg-gray-500';
    }
  };

  // Get icon for event type (for tooltip)
  const getEventIcon = (event: Event) => {
    switch (event.type) {
      case EventType.USER_MESSAGE:
        return <FiMessageSquare size={14} className="text-gray-700 dark:text-gray-300" />;
      case EventType.ASSISTANT_MESSAGE:
        return <FiMessageSquare size={14} className="text-gray-700 dark:text-gray-300" />;
      case EventType.TOOL_CALL:
      case EventType.TOOL_RESULT:
        return <FiTool size={14} className="text-gray-700 dark:text-gray-300" />;
      case EventType.ENVIRONMENT_INPUT:
        return <FiImage size={14} className="text-gray-700 dark:text-gray-300" />;
      case EventType.PLAN_UPDATE:
      case EventType.PLAN_FINISH:
        return <FiCpu size={14} className="text-gray-700 dark:text-gray-300" />;
      case EventType.FINAL_ANSWER:
        return <FiBookOpen size={14} className="text-gray-700 dark:text-gray-300" />;
      default:
        return <FiMessageSquare size={14} className="text-gray-700 dark:text-gray-300" />;
    }
  };

  // Get event description for hover tooltip
  const getEventDescription = (event: Event) => {
    switch (event.type) {
      case EventType.USER_MESSAGE:
        return 'User Message';
      case EventType.ASSISTANT_MESSAGE:
        return 'Assistant Response';
      case EventType.TOOL_CALL:
        return `Tool Call: ${(event as any).name || ''}`;
      case EventType.TOOL_RESULT:
        return `Tool Result: ${(event as any).name || ''}`;
      case EventType.ENVIRONMENT_INPUT:
        return 'Browser Screenshot';
      case EventType.PLAN_UPDATE:
        return 'Plan Update';
      case EventType.PLAN_FINISH:
        return 'Plan Completed';
      case EventType.FINAL_ANSWER:
        return 'Research Report';
      default:
        return event.type;
    }
  };

  // Get event content preview for the tooltip
  const getEventContentPreview = (event: Event) => {
    if (event.type === EventType.USER_MESSAGE || event.type === EventType.ASSISTANT_MESSAGE) {
      const content =
        typeof event.content === 'string'
          ? event.content
          : Array.isArray(event.content) &&
              event.content.length > 0 &&
              event.content[0].type === 'text'
            ? event.content[0].text
            : '';

      return content.length > 50 ? content.substring(0, 47) + '...' : content;
    }
    return '';
  };

  return (
    <div className="relative px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30">
      {/* Current time display */}
      {currentEvent && (
        <div className="absolute left-3 top-0 text-xs text-gray-500 dark:text-gray-400 py-1">
          {formatTimestamp(currentEvent.timestamp)}
        </div>
      )}

      {/* Timeline slider with modern media player styling */}
      <div
        ref={sliderRef}
        className="relative h-6 mt-4 cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseLeave}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track background - simplified and more minimal */}
        <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* No texture dots, keeping it minimal */}
        </div>

        {/* Progress fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-gray-800 dark:bg-gray-300 rounded-full"
          style={{ width: `${currentPosition}%` }}
        />

        {/* Event markers - more subtle, minimal style */}
        {events.map((event, index) => {
          const position = (index / (events.length - 1)) * 100;

          return (
            <motion.div
              key={`${event.id}-${index}`}
              className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-3 ${getEventColor(event)} rounded-sm`}
              style={{ left: `${position}%`, marginLeft: '-1px' }}
              initial={{ opacity: 0.6, height: 3 }}
              animate={{
                opacity: 0.8,
                height: currentEvent?.id === event.id ? 5 : 3,
              }}
              whileHover={{ opacity: 1, height: 5 }}
              transition={{ duration: 0.2 }}
            />
          );
        })}

        {/* Playhead - larger and more prominent but without shadow */}
        <motion.div
          className="absolute top-[5px] -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-gray-200 border-2 border-gray-800 dark:border-gray-600 z-30"
          style={{ left: `calc(${currentPosition}% - 8px)` }}
          animate={{
            scale: isDragging ? 1.2 : 1,
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Hover position indicator */}
        {hoverPosition !== null && !isDragging && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400/40 dark:bg-gray-500/40 rounded-full z-10"
            style={{ left: `${hoverPosition * 100}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>

      {/* Improved hover tooltip - monochromatic style */}
      {hoverEvent && hoverPosition !== null && (
        <motion.div
          className="absolute bottom-full mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200/50 dark:border-gray-700/30 text-xs max-w-xs z-50"
          style={{
            left: `${hoverPosition * 100}%`,
            transform: 'translateX(-50%)',
          }}
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex-shrink-0">{getEventIcon(hoverEvent)}</div>
            <div>
              <div className="font-medium text-gray-800 dark:text-gray-200">
                {getEventDescription(hoverEvent)}
              </div>

              {getEventContentPreview(hoverEvent) && (
                <div className="mt-1 text-gray-600 dark:text-gray-400 italic line-clamp-2 text-[10px]">
                  "{getEventContentPreview(hoverEvent)}"
                </div>
              )}

              <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                {formatTimestamp(hoverEvent.timestamp)}
              </div>
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className="absolute left-1/2 bottom-0 w-2 h-2 bg-gray-100 dark:bg-gray-800 border-r border-b border-gray-200/50 dark:border-gray-700/30 transform rotate-45 translate-y-1 -translate-x-1"></div>
        </motion.div>
      )}
    </div>
  );
};
