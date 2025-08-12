import React from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiZap, FiLoader, FiPlay } from 'react-icons/fi';
import { AgentProcessingPhase } from '@tarko/interface';

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
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: animationDuration,
          repeat: Infinity,
          ease: 'easeInOut',
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
      return 'from-blue-600 via-blue-400 to-blue-600 dark:from-blue-400 dark:via-blue-300 dark:to-blue-400';
    case 'processing':
      return 'from-violet-600 via-violet-400 to-violet-600 dark:from-violet-400 dark:via-violet-300 dark:to-violet-400';
    case 'generating':
    case 'streaming':
      return 'from-emerald-600 via-emerald-400 to-emerald-600 dark:from-emerald-400 dark:via-emerald-300 dark:to-emerald-400';
    case 'executing_tools':
      return 'from-orange-600 via-orange-400 to-orange-600 dark:from-orange-400 dark:via-orange-300 dark:to-orange-400';
    default:
      return 'from-violet-600 via-violet-400 to-violet-600 dark:from-violet-400 dark:via-violet-300 dark:to-violet-400';
  }
};

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  size = 'medium',
  text = 'Agent TARS is running',
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
      {/* Enhanced animated icon */}
      <motion.div
        animate={{
          rotate: phase === 'processing' || phase === 'warming_up' ? 360 : 0,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        className={colorClass}
      >
        <IconComponent size={size === 'small' ? 14 : size === 'medium' ? 16 : 18} />
      </motion.div>

      <div className="flex-1">
        {/* Main status text with gradient effect */}
        <div className="flex items-center space-x-2">
          <GradientText text={text} phase={phase} className={textClass} animationDuration={2.5} />
          <motion.span
            className={`${textClass} ${colorClass} inline-block`}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              times: [0, 0.5, 1],
            }}
          >
            •••
          </motion.span>
        </div>

        {/* Estimated time */}
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

        {/* Progress bar for TTFT */}
        {showProgress && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"
          >
            <motion.div
              className={`h-1.5 rounded-full ${colorClass.replace('text-', 'bg-')}`}
              animate={{ width: ['0%', '30%', '60%', '30%'] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};
