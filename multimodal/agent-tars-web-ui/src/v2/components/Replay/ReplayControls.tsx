import React from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiSkipForward, FiX, FiChevronsRight, FiClock } from 'react-icons/fi';
import { useReplay } from '../../hooks/useReplay';

/**
 * ReplayControls - Provides playback controls for the replay functionality
 * 
 * Design principles:
 * - Minimalist black and white design consistent with UI
 * - Subtle animations for state changes
 * - Clear visual feedback for current state
 * - Elegant spacing and layout
 */
export const ReplayControls: React.FC = () => {
  const { 
    replayState, 
    startReplay, 
    pauseReplay, 
    jumpToResult, 
    exitReplay,
    setPlaybackSpeed
  } = useReplay();
  
  const { isPaused, playbackSpeed } = replayState;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30 shadow-sm"
    >
      {/* Play/Pause button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isPaused ? startReplay : pauseReplay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/30"
      >
        {isPaused ? <FiPlay size={14} /> : <FiPause size={14} />}
      </motion.button>
      
      {/* Jump to result button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={jumpToResult}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Jump to result"
      >
        <FiChevronsRight size={14} />
        <span className="hidden sm:inline">Skip to end</span>
      </motion.button>
      
      {/* Playback speed selector */}
      <div className="flex items-center gap-1 border-l border-gray-200/50 dark:border-gray-700/30 pl-2">
        <FiClock size={12} className="text-gray-500 dark:text-gray-400" />
        {[1, 2, 3].map(speed => (
          <motion.button
            key={speed}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPlaybackSpeed(speed)}
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
              playbackSpeed === speed 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {speed}x
          </motion.button>
        ))}
      </div>
      
      {/* Exit replay button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={exitReplay}
        className="ml-1 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Exit replay"
      >
        <FiX size={14} />
      </motion.button>
    </motion.div>
  );
};
