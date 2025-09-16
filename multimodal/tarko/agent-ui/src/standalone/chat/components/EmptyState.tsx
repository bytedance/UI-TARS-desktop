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
        <span
          key={seconds}
          className="text-xl font-bold text-gray-700 dark:text-gray-300 animate-in zoom-in duration-200"
        >
          {seconds}
        </span>
      </div>
    </div>
  );
};

/**
 * EmptyState Component - Modern, elegant empty state with premium design
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ replayState, isReplayMode }) => {
  const { cancelAutoPlay } = useReplayMode();

  return (
    <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-600">
      <div className="text-center p-8 max-w-lg">
        {/* Auto-play countdown state */}
        {isReplayMode && replayState.autoPlayCountdown !== null ? (
          <div className="relative animate-in zoom-in duration-400">
            {/* Enhanced background card */}
            <div className="bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-gray-100/60 dark:border-gray-700/40">
              {/* Countdown circle with improved design */}
              <div className="flex justify-center mb-8 animate-in zoom-in duration-500 delay-100">
                <div className="relative">
                  <CountdownCircle seconds={replayState.autoPlayCountdown} total={3} />
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-full -z-10 animate-pulse" />
                </div>
              </div>

              {/* Enhanced title and description */}
              <h3 className="text-xl font-display font-semibold mb-3 text-gray-900 dark:text-gray-100 animate-in slide-in-from-bottom-4 fade-in duration-600">
                Auto-play starting
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto animate-in slide-in-from-bottom-4 fade-in duration-600 delay-150">
                Replay will begin in{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {replayState.autoPlayCountdown} second
                  {replayState.autoPlayCountdown !== 1 ? 's' : ''}
                </span>
                . You can cancel or wait for automatic playback.
              </p>

              {/* Enhanced cancel button */}
              <button
                onClick={cancelAutoPlay}
                className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 border border-gray-200/80 dark:border-gray-600/80 shadow-sm hover:shadow-md hover:scale-105 hover:-translate-y-0.5 active:scale-95 animate-in slide-in-from-bottom-4 fade-in duration-600 delay-300"
              >
                <FiX size={16} className="mr-2" />
                Cancel Auto-play
              </button>
            </div>
          </div>
        ) : (
          /* Modern standard empty state */
          <div className="max-w-md mx-auto">
            {/* Enhanced icon with modern design */}
            <div className="relative mb-8 animate-in zoom-in duration-700">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-green-500/15 rounded-full blur-xl animate-pulse" />

              {/* Main icon container */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm hover:scale-105 hover:-translate-y-0.5 transition-transform duration-200">
                {/* Icon */}
                <div className="relative z-10">
                  {isReplayMode && replayState.currentEventIndex === -1 ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-green-600 dark:text-green-400"
                    >
                      <FiPlay size={28} className="ml-1" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <FiMessageSquare size={28} />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced title with gradient */}
            <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-600">
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Ready to replay'
                : 'Start a conversation'}
            </h3>

            {/* Elegant description */}
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-sm mx-auto animate-in slide-in-from-bottom-4 fade-in duration-600 delay-150">
              {isReplayMode && replayState.currentEventIndex === -1
                ? 'Press play to start the replay or use the timeline to navigate through the session.'
                : `Ask ${getAgentTitle()} a question or submit a task to begin your conversation.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
