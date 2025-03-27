import { useAtom } from 'jotai';
import {
  FiX,
  FiMonitor,
  FiCheck,
  FiLoader,
  FiAlertCircle,
  FiInbox,
} from 'react-icons/fi';
import { showCanvasAtom, canvasDataSourceAtom } from '@renderer/state/canvas';
import {
  currentEventIdAtom,
  eventsAtom,
  planTasksAtom,
} from '@renderer/state/chat';
import { PlayerControls } from './PlayerControls';
import { ActionStatus } from '@renderer/type/agent';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EventContentDescriptor,
  EventItem,
  EventType,
} from '@renderer/type/event';
import { renderPlatformPanel } from './renderPlatformPanel';
import styles from './index.module.scss';

const StatusIcon = ({ status }: { status: ActionStatus }) => {
  switch (status) {
    case ActionStatus.Success:
      return <FiCheck className="w-5 h-5 text-green-500" />;
    case ActionStatus.Running:
      return <FiLoader className="w-5 h-5 text-blue-500 animate-spin" />;
    case ActionStatus.Failed:
      return <FiAlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
};

export function EventPlayer() {
  const [, setShowCanvas] = useAtom(showCanvasAtom);
  const [dataSource] = useAtom(canvasDataSourceAtom);
  const [events] = useAtom(eventsAtom);
  const [currentEvent, setCurrentEvent] = useState<EventItem | undefined>();
  const [, setPlanTasks] = useAtom(planTasksAtom);
  const [eventId] = useAtom(currentEventIdAtom);

  const toolEvents = useMemo(() => {
    return events
      .filter((event) => event.type === EventType.ToolUsed)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events]);

  const timeRange = useMemo(() => {
    if (toolEvents.length === 0) {
      return { start: 0, end: 0 };
    }
    return {
      start: toolEvents[0].timestamp,
      end: toolEvents[toolEvents.length - 1].timestamp,
    };
  }, [toolEvents]);

  const findEventByTimestamp = useCallback(
    (timestamp: number) => {
      return toolEvents.reduce(
        (prev, curr) => {
          if (!prev) return curr;
          return Math.abs(curr.timestamp - timestamp) <
            Math.abs(prev.timestamp - timestamp)
            ? curr
            : prev;
        },
        undefined as EventItem | undefined,
      );
    },
    [toolEvents],
  );

  const handlePrevious = useCallback(() => {
    if (!currentEvent || toolEvents.length === 0) return;
    const currentIndex = toolEvents.findIndex((e) => e.id === currentEvent.id);
    if (currentIndex > 0) {
      setCurrentEvent(toolEvents[currentIndex - 1]);
    }
  }, [currentEvent, toolEvents]);

  const handleNext = useCallback(() => {
    if (!currentEvent || toolEvents.length === 0) return;
    const currentIndex = toolEvents.findIndex((e) => e.id === currentEvent.id);
    if (currentIndex < toolEvents.length - 1) {
      setCurrentEvent(toolEvents[currentIndex + 1]);
    }
  }, [currentEvent, toolEvents]);

  const handleSeek = useCallback(
    (timestamp: number) => {
      const event = findEventByTimestamp(timestamp);
      const currentEventIndex = toolEvents.findIndex((e) => e.id === event?.id);
      const lastPlanUpdateEvent = toolEvents
        .slice(0, currentEventIndex)
        .reverse()
        .find((e) => e.type === EventType.PlanUpdate);
      setPlanTasks(lastPlanUpdateEvent?.content?.planTasks || []);
      setCurrentEvent(event);
    },
    [findEventByTimestamp],
  );

  useEffect(() => {
    const event = toolEvents.find((item) => item.id === eventId);
    setCurrentEvent(event || toolEvents[0]);
  }, [dataSource, toolEvents]);

  const eventData =
    currentEvent?.content as EventContentDescriptor['tool-used'];

  const renderContent = () => {
    if (!currentEvent || toolEvents.length === 0) {
      return (
        <div className="h-full w-full flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
            <FiInbox className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-6" />
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-3">
              No events to display
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please select an event to view its details and execution progress
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {eventData?.tool}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {eventData?.value}
            </span>
          </div>
          {eventData?.status && (
            <StatusIcon status={eventData?.status || ActionStatus.Running} />
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {currentEvent && renderPlatformPanel({ event: currentEvent })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-xl"
      style={{
        maxHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        className={`${styles.header} flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800`}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          My Computer
        </h2>
        <button
          onClick={() => setShowCanvas(false)}
          className={`${styles.closeButton} p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors`}
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Tool Info */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
        <FiMonitor className="w-5 h-5 text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {eventData?.description || 'Tool execution details'}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4">{renderContent()}</div>

      {/* Player Controls */}
      <div className="flex-shrink-0">
        <PlayerControls
          currentTime={currentEvent?.timestamp || timeRange.start}
          startTime={timeRange.start}
          endTime={timeRange.end}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSeek={handleSeek}
        />
      </div>

      {/* Progress Bar */}
      {/* <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${
                (((currentEvent?.timestamp || timeRange.start) -
                  timeRange.start) /
                  (timeRange.end - timeRange.start)) *
                100
              }%`,
            }}
          />
        </div>
      </div> */}
    </div>
  );
}
