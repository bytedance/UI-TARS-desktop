import React from 'react';
import { motion } from 'framer-motion';
import { FiX, FiPlay } from 'react-icons/fi';
import { getAgentTitle } from '@/config/web-ui-config';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { ReplayState } from '@/common/state/atoms/replay';

interface EmptyStateProps {
  replayState: ReplayState;
  isReplayMode: boolean;
}

/**
 * CountdownCircle component for auto-play countdown
 */
const CountdownCircle: React.FC<{ seconds: number; total: number }> = ({ seconds, total }) => {
  const progress = ((total - seconds) / total) * 100;
  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-accent-500 dark:text-accent-400 transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={seconds}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-xl font-bold text-gray-700 dark:text-gray-300"
        >
          {seconds}
        </motion.span>
      </div>
    </div>
  );
};

/**
 * EmptyState Component - Elegant empty state with auto-play countdown
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ replayState, isReplayMode }) => {
  const { cancelAutoPlay } = useReplayMode();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full min-h-[400px]"
    >
      <div className="text-center p-8 max-w-lg">
        {/* Auto-play countdown state */}
        {isReplayMode && replayState.autoPlayCountdown !== null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            {/* Enhanced background card */}
            <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-gray-100/60 dark:border-gray-700/40">
              {/* Countdown circle with improved design */}
              <motion.div
                className="flex justify-center mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="relative">
                  <CountdownCircle seconds={replayState.autoPlayCountdown} total={3} />
                  {/* Subtle glow effect */}
                  <motion.div
                    className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-full -z-10"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0, 0.3, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              </motion.div>

              {/* Enhanced title and description */}
              <motion.h3
                className="text-xl font-display font-semibold mb-3 text-gray-900 dark:text-gray-100"
                variants={itemVariants}
              >
                Auto-play starting
              </motion.h3>
              <motion.p
                className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto"
                variants={itemVariants}
              >
                Replay will begin in{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {replayState.autoPlayCountdown} second
                  {replayState.autoPlayCountdown !== 1 ? 's' : ''}
                </span>
                . You can cancel or wait for automatic playback.
              </motion.p>

              {/* Enhanced cancel button */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={cancelAutoPlay}
                className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 border border-gray-200/80 dark:border-gray-600/80 shadow-sm hover:shadow-md"
              >
                <FiX size={16} className="mr-2" />
                Cancel Auto-play
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Standard empty state */
          <motion.div variants={containerVariants}>
            {/* Icon */}
            <motion.div
              variants={itemVariants}
              className="w-16 h-16 bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm"
            >
              <FiPlay size={24} className="text-gray-500 dark:text-gray-400 ml-1" />
            </motion.div>

            {/* Title */}
            <motion.h3
              variants={itemVariants}
              className="text-xl font-display font-semibold mb-3 text-gray-900 dark:text-gray-100"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Ready to replay'
                : 'Start a conversation'}
            </motion.h3>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Press play to start the replay or use the timeline to navigate through the session.'
                : `Ask ${getAgentTitle()} a question or submit a task to begin your conversation.`}
            </motion.p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
