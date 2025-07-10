import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlay,
  FiPause,
  FiX,
  FiRefreshCw,
  FiSkipForward,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { AgentEventStream } from '@/common/types';
import { formatTimestamp } from '@/common/utils/formatters';
import { useReplay } from '@/common/hooks/useReplay';

/**
 * ReplayControlPanel - Unified replay control panel
 *
 * Design features:
 * - Compact player-style interface
 * - Integrated timeline and control buttons
 * - Elegant monochrome color scheme with refined dark mode
 * - Seamlessly attached to workspace bottom
 */
export const ReplayControlPanel: React.FC = () => {
  const {
    replayState,
    startReplay,
    pauseReplay,
    jumpToPosition,
    jumpToResult,
    exitReplay,
    setPlaybackSpeed,
    cancelAutoPlay,
    resetReplay,
    getCurrentPosition,
    getCurrentEvent,
  } = useReplay();

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverEvent, setHoverEvent] = useState<AgentEventStream.Event | null>(null);

  const { events, isPaused, playbackSpeed, autoPlayCountdown, currentEventIndex } = replayState;
  const currentPosition = getCurrentPosition();
  const currentEvent = getCurrentEvent();

  // Determine button states
  const isCountingDown = autoPlayCountdown !== null;
  const showPlayButton = isPaused || isCountingDown;
  const isReplayCompleted =
    events.length > 0 && currentEventIndex === events.length - 1 && isPaused;

  // Timeline interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    updatePositionFromMouse(e);
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    setHoverPosition(position);

    if (events.length > 0) {
      const index = Math.floor(position * events.length);
      const boundedIndex = Math.max(0, Math.min(index, events.length - 1));
      setHoverEvent(events[boundedIndex]);
    }

    if (isDragging) {
      updatePositionFromMouse(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    setHoverEvent(null);
    if (!isDragging) {
      // 只有在不拖拽时才重置拖拽状态
      setIsDragging(false);
    }
  };

  const updatePositionFromMouse = (e: React.MouseEvent | MouseEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    jumpToPosition(position);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        updatePositionFromMouse(e);
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  const getEventDescription = (event: AgentEventStream.Event) => {
    switch (event.type) {
      case 'user_message':
        return 'User Message';
      case 'assistant_message':
        return 'Assistant Response';
      case 'tool_call':
        return `Tool Call: ${event.name || ''}`;
      case 'tool_result':
        return `Tool Result: ${event.name || ''}`;
      case 'environment_input':
        return 'Browser Screenshot';
      case 'plan_update':
        return 'Plan Update';
      case 'plan_finish':
        return 'Plan Completed';
      case 'final_answer':
        return 'Research Report';
      default:
        return event.type;
    }
  };

  const handlePlayPause = () => {
    if (isCountingDown) {
      cancelAutoPlay();
      startReplay();
    } else if (isPaused) {
      startReplay();
    } else {
      pauseReplay();
    }
  };

  const handlePrevious = () => {
    const prevIndex = Math.max(0, currentEventIndex - 1);
    jumpToPosition(prevIndex / (events.length - 1));
  };

  const handleNext = () => {
    const nextIndex = Math.min(events.length - 1, currentEventIndex + 1);
    jumpToPosition(nextIndex / (events.length - 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
      className="relative workspace-control-panel"
    >
      {/* Timeline section */}
      <div className="px-4 pt-3 pb-2">
        <div
          ref={sliderRef}
          className="relative h-3 cursor-pointer group"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Track background */}
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-900 rounded-full overflow-hidden">
            {/* Progress bar */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-600 dark:to-gray-500 rounded-full transition-all duration-150 shadow-sm"
              style={{ width: `${currentPosition}%` }}
            />
          </div>

          {/* Playhead - Draggable playhead */}
          <motion.div
            className="absolute -top-[2px] -translate-y-1/2 w-5 h-5 bg-white dark:bg-gray-300 border-2 border-gray-700 dark:border-gray-400 rounded-full shadow-lg z-10 cursor-grab active:cursor-grabbing transition-all duration-150"
            style={{ left: `calc(${currentPosition}% - 10px)` }}
            onMouseDown={handlePlayheadMouseDown}
            animate={{
              scale: isDragging ? 1.2 : 1,
              boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.15)',
            }}
            transition={{ duration: 0.15 }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-700 dark:bg-gray-600 rounded-full pointer-events-none" />
          </motion.div>

          {/* Hover indicator */}
          {hoverPosition !== null && !isDragging && (
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-400/60 dark:bg-gray-500/80 rounded-full pointer-events-none"
              style={{ left: `${hoverPosition * 100}%`, marginLeft: '-1px' }}
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </div>

        {/* Hover tooltip */}
        {hoverEvent && hoverPosition !== null && !isDragging && (
          <motion.div
            className="absolute bottom-full mb-3 px-3 py-2 bg-gray-900 dark:bg-gray-850 text-white dark:text-gray-200 text-xs rounded-lg shadow-xl z-50 whitespace-nowrap border border-gray-700/50 dark:border-gray-700/60 pointer-events-none"
            style={{
              left: `${hoverPosition * 100}%`,
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="font-medium text-gray-100 dark:text-gray-200">
              {getEventDescription(hoverEvent)}
            </div>
            <div className="text-gray-400 dark:text-gray-400 mt-0.5">
              {formatTimestamp(hoverEvent.timestamp)}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-850" />
          </motion.div>
        )}
      </div>

      {/* Control section */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Left: Exit and speed display */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exitReplay}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Exit replay"
          >
            <FiX size={16} />
          </motion.button>

          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Speed: {playbackSpeed}x</span>
          </div>
        </div>

        {/* Center: Playback controls */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevious}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={currentEventIndex <= 0}
          >
            <FiChevronLeft size={18} />
          </motion.button>

          {isReplayCompleted ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetReplay}
              className="w-10 h-10 flex items-center justify-center bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-200 rounded-full shadow-sm hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              title="Replay from beginning"
            >
              <FiRefreshCw size={18} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              className="w-10 h-10 flex items-center justify-center bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-200 rounded-full shadow-sm hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              title={showPlayButton ? 'Play' : 'Pause'}
            >
              {showPlayButton ? <FiPlay size={18} /> : <FiPause size={18} />}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={currentEventIndex >= events.length - 1}
          >
            <FiChevronRight size={18} />
          </motion.button>
        </div>

        {/* Right: Time display and speed controls */}
        <div className="flex items-center gap-3">
          {/* Time display */}
          {currentEvent && (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {formatTimestamp(currentEvent.timestamp)}
            </div>
          )}

          {/* Speed control buttons */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((speed) => (
              <motion.button
                key={speed}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPlaybackSpeed(speed)}
                className={`w-6 h-6 flex items-center justify-center text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50'
                }`}
              >
                {speed}x
              </motion.button>
            ))}
          </div>

          {/* Skip to end button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isCountingDown) {
                cancelAutoPlay();
              }
              jumpToResult();
            }}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Skip to end"
          >
            <FiSkipForward size={18} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
