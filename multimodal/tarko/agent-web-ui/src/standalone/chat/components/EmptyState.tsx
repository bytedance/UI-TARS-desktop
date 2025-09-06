import React from 'react';
import { motion } from 'framer-motion';
import { FiX, FiPlay, FiMessageSquare } from 'react-icons/fi';
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
          strokeWidth="1.5"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500 dark:text-blue-400 transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={seconds}
          initial={{ scale: 1.1, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          {seconds}
        </motion.span>
      </div>
    </div>
  );
};

/**
 * EmptyState Component - Refined, sophisticated design with subtle elegance
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ replayState, isReplayMode }) => {
  const { cancelAutoPlay } = useReplayMode();

  // Refined animation system - elegant and purposeful
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.08,
        ease: [0.23, 1, 0.32, 1], // Sophisticated easing
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full min-h-[400px]"
    >
      <div className="text-center p-8 max-w-md">
        {/* Auto-play countdown state */}
        {isReplayMode && replayState.autoPlayCountdown !== null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="relative"
          >
            {/* Minimalist card with subtle depth */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-8 shadow-sm border border-gray-100/50 dark:border-gray-700/30">
              {/* Countdown circle */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              >
                <CountdownCircle seconds={replayState.autoPlayCountdown} total={3} />
              </motion.div>

              {/* Clean typography */}
              <motion.h3
                className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100"
                variants={itemVariants}
              >
                Auto-play starting
              </motion.h3>
              <motion.p
                className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed"
                variants={itemVariants}
              >
                Replay begins in{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {replayState.autoPlayCountdown}
                </span>
                {' '}second{replayState.autoPlayCountdown !== 1 ? 's' : ''}
              </motion.p>

              {/* Refined cancel button */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.01, y: -0.5 }}
                whileTap={{ scale: 0.99 }}
                onClick={cancelAutoPlay}
                className="inline-flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 border border-gray-200/60 dark:border-gray-600/40"
              >
                <FiX size={14} className="mr-1.5" />
                Cancel
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Sophisticated standard empty state */
          <motion.div variants={containerVariants}>
            {/* Sophisticated icon design with visual interest */}
            <motion.div variants={iconVariants} className="relative mb-8">
              {/* Elegant ambient glow */}
              <motion.div
                className="absolute inset-0 w-20 h-20 mx-auto bg-gradient-to-r from-blue-500/12 via-purple-500/8 to-blue-500/12 rounded-full blur-2xl"
                animate={{
                  scale: [0.9, 1.1, 0.9],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Premium icon container with depth */}
              <motion.div
                className="relative w-20 h-20 bg-gradient-to-br from-white via-gray-50/80 to-white dark:from-gray-800 dark:via-gray-750/90 dark:to-gray-800 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/50 dark:border-gray-700/50"
                whileHover={{ 
                  scale: 1.05, 
                  y: -3,
                  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.15)'
                }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Icon with engaging animation */}
                <div className="relative">
                  {isReplayMode && replayState.currentEventIndex === -1 ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-green-600 dark:text-green-400"
                    >
                      <FiPlay size={24} className="ml-0.5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{
                        rotate: [0, 3, -3, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <FiMessageSquare size={24} />
                    </motion.div>
                  )}
                </div>
                
                {/* Sophisticated status indicator */}
                <motion.div
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-sm"
                  animate={{
                    scale: [0.8, 1.1, 0.8],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
              
              {/* Subtle floating accents */}
              <motion.div
                className="absolute -top-2 -left-3 w-1.5 h-1.5 bg-blue-400/40 rounded-full"
                animate={{
                  y: [-4, 4, -4],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute -bottom-1 -right-3 w-1 h-1 bg-purple-400/40 rounded-full"
                animate={{
                  y: [3, -3, 3],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
              />
            </motion.div>

            {/* Elegant typography with subtle gradient */}
            <motion.h3
              variants={itemVariants}
              className="text-2xl font-semibold mb-4 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 text-transparent bg-clip-text tracking-tight"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Ready to replay'
                : 'Start a conversation'}
            </motion.h3>

            {/* Refined description with better spacing */}
            <motion.p
              variants={itemVariants}
              className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-sm mx-auto"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Press play to start the replay or navigate using the timeline.'
                : `Ask ${getAgentTitle()} a question or submit a task to begin.`}
            </motion.p>
            
            {/* Sophisticated progress indicator */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center"
            >
              <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500/60 to-purple-500/60 rounded-full"
                    animate={{
                      scale: [0.7, 1.2, 0.7],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
