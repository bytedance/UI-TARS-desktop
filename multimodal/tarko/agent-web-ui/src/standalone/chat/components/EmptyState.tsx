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
            {/* Refined icon design */}
            <motion.div variants={iconVariants} className="relative mb-8">
              {/* Subtle ambient glow */}
              <motion.div
                className="absolute inset-0 w-16 h-16 mx-auto bg-blue-500/8 dark:bg-blue-400/6 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 0.8, 0.6],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Main icon container - refined materials */}
              <motion.div
                className="relative w-16 h-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-gray-200/40 dark:border-gray-700/40"
                whileHover={{ 
                  scale: 1.02, 
                  y: -1,
                  boxShadow: '0 8px 25px -8px rgba(0,0,0,0.1)'
                }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Icon with subtle animation */}
                <div className="relative">
                  {isReplayMode && replayState.currentEventIndex === -1 ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-green-600 dark:text-green-400"
                    >
                      <FiPlay size={20} className="ml-0.5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{
                        rotate: [0, 2, -2, 0],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <FiMessageSquare size={20} />
                    </motion.div>
                  )}
                </div>
                
                {/* Minimal status indicator */}
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Typography with refined hierarchy */}
            <motion.h3
              variants={itemVariants}
              className="text-xl font-medium mb-3 text-gray-900 dark:text-gray-100 tracking-tight"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Ready to replay'
                : 'Start a conversation'}
            </motion.h3>

            {/* Elegant description */}
            <motion.p
              variants={itemVariants}
              className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm max-w-xs mx-auto"
            >
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Press play to start the replay or navigate using the timeline.'
                : `Ask ${getAgentTitle()} a question or submit a task to begin.`}
            </motion.p>
            
            {/* Minimal progress indicator */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center mt-6"
            >
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-gray-400/60 dark:bg-gray-500/60 rounded-full"
                    animate={{
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
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
