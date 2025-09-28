import React from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiRotateCcw, FiSkipForward } from 'react-icons/fi';
import { useReplay } from '@/common/hooks/useReplay';

/**
 * ReplayControlPanel - Simplified replay controls
 */
export const ReplayControlPanel: React.FC = () => {
  const {
    replayState,
    startReplay,
    pauseReplay,
    jumpToPosition,
    jumpToFinalState,
    resetAndPlay,
    setPlaybackSpeed,
    getCurrentPosition,
  } = useReplay();

  if (!replayState.isActive) return null;

  const currentPosition = getCurrentPosition() / 100; // Convert to 0-1 range
  const hasEvents = replayState.events.length > 0;

  const handleTimelineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseFloat(event.target.value);
    jumpToPosition(position);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="border-t border-gray-200/60 dark:border-gray-700/60 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm"
    >
      <div className="px-4 py-3">
        {/* Timeline */}
        <div className="mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-12">
              {replayState.currentEventIndex + 1}/{replayState.events.length}
            </span>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={currentPosition}
                onChange={handleTimelineChange}
                disabled={!hasEvents}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-8">
              {Math.round(currentPosition * 100)}%
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <button
              onClick={replayState.isPlaying ? pauseReplay : startReplay}
              disabled={!hasEvents}
              className="p-2 rounded-lg bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-800/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              {replayState.isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
            </button>

            {/* Reset and play */}
            <button
              onClick={resetAndPlay}
              disabled={!hasEvents}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              title="Reset and play from start"
            >
              <FiRotateCcw size={16} />
            </button>

            {/* Jump to end */}
            <button
              onClick={jumpToFinalState}
              disabled={!hasEvents}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              title="Jump to final state"
            >
              <FiSkipForward size={16} />
            </button>
          </div>

          {/* Speed controls */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Speed:</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
                  replayState.playbackSpeed === speed
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
