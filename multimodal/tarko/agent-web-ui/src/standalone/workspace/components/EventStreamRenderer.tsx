import React, { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiChevronDown, FiClock, FiMessageSquare } from 'react-icons/fi';
import { rawEventsAtom } from '@/common/state/atoms/rawEvents';
import { useSession } from '@/common/hooks/useSession';
import { AgentEventStream } from '@/common/types';

interface EventStreamRendererProps {
  onEventClick?: (event: AgentEventStream.Event) => void;
}

interface EventItemProps {
  event: AgentEventStream.Event;
  index: number;
  onClick?: () => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, index, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'user_message':
      case 'assistant_message':
      case 'assistant_streaming_message':
        return <FiMessageSquare size={14} />;
      default:
        return <FiClock size={14} />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'user_message':
        return 'text-blue-600 dark:text-blue-400';
      case 'assistant_message':
      case 'assistant_streaming_message':
        return 'text-green-600 dark:text-green-400';
      case 'tool_call':
      case 'assistant_streaming_tool_call':
        return 'text-purple-600 dark:text-purple-400';
      case 'tool_result':
        return 'text-orange-600 dark:text-orange-400';
      case 'final_answer':
      case 'final_answer_streaming':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const renderEventContent = () => {
    const content = JSON.stringify(event, null, 2);
    return (
      <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
        {content}
      </pre>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 pb-4 relative group"
    >
      {/* Timeline dot */}
      <div
        className={`absolute -left-2 top-1 w-3 h-3 rounded-full bg-white dark:bg-gray-900 border-2 ${getEventColor(event.type).replace('text-', 'border-')}`}
      />

      {/* Event header */}
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded -ml-2"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onClick?.();
        }}
      >
        <button className="flex items-center justify-center w-4 h-4">
          {isExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </button>

        <div className={`flex items-center gap-1 ${getEventColor(event.type)}`}>
          {getEventIcon(event.type)}
          <span className="font-medium text-sm">{event.type}</span>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>

      {/* Event content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 ml-6"
          >
            {renderEventContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const EventStreamRenderer: React.FC<EventStreamRendererProps> = ({ onEventClick }) => {
  const [rawEvents] = useAtom(rawEventsAtom);
  const { activeSessionId } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const currentSessionEvents = activeSessionId ? rawEvents[activeSessionId] || [] : [];

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSessionEvents.length, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  const handleEventClick = (event: AgentEventStream.Event) => {
    onEventClick?.(event);
  };

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">📡</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No Active Session</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start a conversation to see the event stream.
          </p>
        </div>
      </div>
    );
  }

  if (currentSessionEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">⏳</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">Waiting for Events</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Events will appear here as they stream in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FiClock className="text-gray-500" size={16} />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Event Stream</h3>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
            {currentSessionEvents.length} events
          </span>
        </div>

        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            Jump to Latest
          </button>
        )}
      </div>

      {/* Event list */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {currentSessionEvents.map((event, index) => (
          <EventItem
            key={`${event.timestamp}-${index}`}
            event={event}
            index={index}
            onClick={() => handleEventClick(event)}
          />
        ))}
      </div>
    </div>
  );
};
