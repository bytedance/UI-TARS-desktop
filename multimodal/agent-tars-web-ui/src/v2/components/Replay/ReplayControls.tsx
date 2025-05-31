import React from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiSkipForward, FiX, FiClock } from 'react-icons/fi';
import { useReplay } from '../../hooks/useReplay';

/**
 * ReplayControls - Provides playback controls for the replay functionality
 *
 * Design principles:
 * - Monochromatic black/gray design that matches the UI
 * - Minimalist controls with subtle hover states
 * - No box shadows or excessive decorations
 */
export const ReplayControls: React.FC = () => {
  const {
    replayState,
    startReplay,
    pauseReplay,
    jumpToResult,
    exitReplay,
    setPlaybackSpeed,
    cancelAutoPlay,
  } = useReplay();

  const { isPaused, playbackSpeed, autoPlayCountdown } = replayState;

  // 确定按钮状态 - 添加倒计时判断
  const isCountingDown = autoPlayCountdown !== null;
  const showPlayButton = isPaused || isCountingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30"
    >
      {/* Exit button - moved to left side */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={exitReplay}
        className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700/50 transition-colors"
        title="Exit replay"
      >
        <FiX size={16} />
      </motion.button>

      {/* Center playback controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button - now larger and more prominent */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isCountingDown) {
              // 如果在倒计时，取消倒计时并开始播放
              cancelAutoPlay();
              startReplay();
            } else if (isPaused) {
              startReplay();
            } else {
              pauseReplay();
            }
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800"
        >
          {showPlayButton ? <FiPlay size={18} /> : <FiPause size={18} />}
        </motion.button>

        {/* Skip to end button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // 如果在倒计时，先取消倒计时
            if (isCountingDown) {
              cancelAutoPlay();
            }
            jumpToResult();
          }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          title="Skip to end"
        >
          <FiSkipForward size={16} />
        </motion.button>
      </div>

      {/* Playback speed controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
          <FiClock size={12} className="inline mr-1" />
          Speed
        </span>
        {[1, 2, 3].map((speed) => (
          <motion.button
            key={speed}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPlaybackSpeed(speed)}
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
              playbackSpeed === speed
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300/50 dark:border-gray-600/30'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700/50'
            }`}
          >
            {speed}x
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
