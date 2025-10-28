import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { Dialog, DialogPanel } from '@tarko/ui';
import { FiX, FiChevronRight, FiChevronDown, FiFilter } from 'react-icons/fi';
import { rawEventsAtom } from '@/common/state/atoms/rawEvents';
import { useSession } from '@/common/hooks/useSession';
import { JsonRenderer } from '@/common/components/JsonRenderer';
import { AgentEventStream } from '@/common/types';

interface EventStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EventItemProps {
  event: AgentEventStream.Event;
  index: number;
}

const EventItem: React.FC<EventItemProps> = ({ event, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEventSummary = (event: AgentEventStream.Event): string => {
    switch (event.type) {
      case 'user_message':
        return `User: ${event.content?.slice(0, 50) || 'Message'}...`;
      case 'assistant_message':
        return `Assistant: ${event.content?.slice(0, 50) || 'Response'}...`;
      case 'tool_call':
        return `Tool Call: ${event.name || 'Unknown'}`;
      case 'tool_result':
        return `Tool Result: ${event.error ? 'Error' : 'Completed'}`;
      default:
        return event.type;
    }
  };

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-900 text-left"
      >
        {isExpanded ? (
          <FiChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        ) : (
          <FiChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-yellow-400 font-mono text-sm">
              [{new Date(event.timestamp).toISOString()}]
            </span>
            <span className="text-blue-400 font-mono text-sm">{event.type}</span>
          </div>
          <div className="text-gray-300 text-sm truncate">{getEventSummary(event)}</div>
        </div>
      </button>

      {isExpanded && <JsonRenderer data={event} className="text-sm p-3" />}
    </div>
  );
};

export const EventStreamModal: React.FC<EventStreamModalProps> = ({ isOpen, onClose }) => {
  const [rawEvents] = useAtom(rawEventsAtom);
  const { activeSessionId } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const currentSessionEvents = activeSessionId ? rawEvents[activeSessionId] || [] : [];

  // Get unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(currentSessionEvents.map((event) => event.type));
    return Array.from(types).sort();
  }, [currentSessionEvents]);

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'all') {
      return currentSessionEvents;
    }
    return currentSessionEvents.filter((event) => event.type === selectedFilter);
  }, [currentSessionEvents, selectedFilter]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents.length]);

  return (
    <Dialog open={isOpen} onClose={onClose} fullScreen>
      <DialogPanel className="w-full h-full bg-black text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-mono">Event Stream Debug</h2>
            <span className="text-sm text-gray-400">
              Session: {activeSessionId || 'None'} | Events: {filteredEvents.length}/
              {currentSessionEvents.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <FiFilter size={16} className="text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded transition-colors">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          {filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 font-mono">
                {currentSessionEvents.length === 0
                  ? 'No events yet...'
                  : `No events of type "${selectedFilter}"`}
              </div>
            </div>
          ) : (
            <div>
              {filteredEvents.map((event, index) => (
                <EventItem key={`${event.timestamp}-${index}`} event={event} index={index} />
              ))}
            </div>
          )}
        </div>
      </DialogPanel>
    </Dialog>
  );
};
