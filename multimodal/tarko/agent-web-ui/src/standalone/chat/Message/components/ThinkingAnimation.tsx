import React from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiZap, FiLoader, FiPlay } from 'react-icons/fi';
import { AgentProcessingPhase } from '@tarko/interface';
import { getAgentTitle } from '@/common/constants';

interface ThinkingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  phase?: AgentProcessingPhase;
  estimatedTime?: string;
  showProgress?: boolean;
}

const getPhaseIcon = (phase?: string) => {
  switch (phase) {
    case 'initializing':
    case 'warming_up':
      return FiCpu;
    case 'processing':
      return FiLoader;
    case 'generating':
    case 'streaming':
      return FiZap;
    case 'executing_tools':
      return FiPlay;
    default:
      return FiLoader;
  }
};

const getPhaseColor = (phase?: string) => {
  switch (phase) {
    case 'initializing':
    case 'warming_up':
      return 'text-blue-600 dark:text-blue-400';
    case 'processing':
      return 'text-violet-600 dark:text-violet-400';
    case 'generating':
    case 'streaming':
      return 'text-green-600 dark:text-green-400';
    case 'executing_tools':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-violet-600 dark:text-violet-400';
  }
};

/**
 * GradientText Component - Creates animated left-to-right color gradient effect
 */
interface GradientTextProps {
  text: string;
  phase?: string;
  className?: string;
  animationDuration?: number;
}

const GradientText: React.FC<GradientTextProps> = ({
  text,
  phase,
  className = '',
  animationDuration = 2,
}) => {
  const colorClass = getPhaseColor(phase);

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Fallback text for browsers that don't support gradients */}
      <span className={`font-medium ${colorClass}`}>{text}</span>

      {/* Enhanced gradient overlay with CSS gradients (more reliable than SVG) */}
      <motion.span
        className={`absolute inset-0 font-medium bg-gradient-to-r ${getGradientClasses(phase)} bg-clip-text text-transparent`}
        style={{
          backgroundSize: '300% 100%',
        }}
        animate={{
          backgroundPosition: ['200% 50%', '-100% 50%'],
        }}
        transition={{
          duration: animationDuration * 0.7, // Faster animation
          repeat: Infinity,
          ease: 'linear', // Using linear for smoother animation
        }}
      >
        {text}
      </motion.span>
    </span>
  );
};

// CSS gradient classes for better browser support
const getGradientClasses = (phase?: string) => {
  switch (phase) {
    case 'initializing':
    case 'warming_up':
      return 'from-blue-600 via-blue-300 to-blue-600 dark:from-blue-400 dark:via-blue-200 dark:to-blue-400';
    case 'processing':
      return 'from-violet-600 via-violet-300 to-violet-600 dark:from-violet-400 dark:via-violet-200 dark:to-violet-400';
    case 'generating':
    case 'streaming':
      return 'from-emerald-600 via-emerald-300 to-emerald-600 dark:from-emerald-400 dark:via-emerald-200 dark:to-emerald-400';
    case 'executing_tools':
      return 'from-orange-600 via-orange-300 to-orange-600 dark:from-orange-400 dark:via-orange-200 dark:to-orange-400';
    default:
      return 'from-violet-600 via-violet-300 to-violet-600 dark:from-violet-400 dark:via-violet-200 dark:to-violet-400';
  }
};

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  size = 'medium',
  text = `${getAgentTitle()} is running`,
  className = '',
  phase,
  estimatedTime,
  showProgress = false,
}) => {
  const textClass = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base';
  const IconComponent = getPhaseIcon(phase);
  const colorClass = getPhaseColor(phase);

  return (
    <div className={`p-3 flex items-center space-x-3 ${className}`}>
      {/* Enhanced animated icon with more pronounced animation */}
      <motion.div
        animate={{
          rotate: phase === 'processing' || phase === 'warming_up' ? 360 : 0,
          scale: [1, 1.2, 1],
        }}
        transition={{
          rotate: {
            duration: 1.5, // Faster rotation
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 1.2, // Faster pulsing
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        className={`${colorClass} drop-shadow-md`} // Added drop shadow for emphasis
      >
        <IconComponent size={size === 'small' ? 14 : size === 'medium' ? 18 : 20} />
      </motion.div>

      <div className="flex-1">
        {/* Main status text with enhanced gradient effect */}
        <div className="flex items-center space-x-2">
          <GradientText
            text={text}
            phase={phase}
            className={`${textClass} font-semibold`}
            animationDuration={1.8}
          />
          <motion.span
            className={`${textClass} ${colorClass} inline-block font-bold`}
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 0.8] }}
            transition={{
              duration: 0.8, // Faster animation
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              times: [0, 0.5, 1],
            }}
          >
            •••
          </motion.span>
        </div>

        {/* Estimated time with subtle animation */}
        {estimatedTime && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`${size === 'small' ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400 mt-1`}
          >
            Expected: {estimatedTime}
          </motion.div>
        )}

        {/* Enhanced progress bar with flowing animation */}
        {showProgress && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden relative"
          >
            {/* Main progress bar */}
            <motion.div
              className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`}
              animate={{ width: ['15%', '90%'] }}
              transition={{
                duration: 1.8, // Slightly faster
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Primary flowing highlight effect */}
            <motion.div
              className="absolute top-0 h-full w-20 bg-white bg-opacity-30 blur-sm"
              animate={{ left: ['-5%', '105%'] }}
              transition={{
                duration: 1.0, // Faster for more fluid motion
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 0.05, // Shorter delay for more continuous flow
              }}
              style={{ borderRadius: 'inherit' }}
            />

            {/* Secondary flowing highlight effect (offset) */}
            <motion.div
              className="absolute top-0 h-full w-12 bg-white bg-opacity-20 blur-sm"
              animate={{ left: ['-15%', '110%'] }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                ease: 'linear',
                delay: 0.3, // Shorter offset for better flow
              }}
              style={{ borderRadius: 'inherit' }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};
