import React from 'react';
import { motion } from 'framer-motion';
import { FiCpu, FiZap, FiLoader, FiPlay } from 'react-icons/fi';

interface ThinkingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  phase?:
    | 'initializing'
    | 'processing'
    | 'generating'
    | 'streaming'
    | 'executing_tools'
    | 'warming_up';
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

const getPhaseGradientColors = (phase?: string) => {
  switch (phase) {
    case 'initializing':
    case 'warming_up':
      return {
        from: '#2563eb', // blue-600
        to: '#60a5fa', // blue-400
        darkFrom: '#60a5fa', // blue-400
        darkTo: '#93c5fd', // blue-300
      };
    case 'processing':
      return {
        from: '#7c3aed', // violet-600
        to: '#a78bfa', // violet-400
        darkFrom: '#a78bfa', // violet-400
        darkTo: '#c4b5fd', // violet-300
      };
    case 'generating':
    case 'streaming':
      return {
        from: '#059669', // emerald-600
        to: '#34d399', // emerald-400
        darkFrom: '#34d399', // emerald-400
        darkTo: '#6ee7b7', // emerald-300
      };
    case 'executing_tools':
      return {
        from: '#ea580c', // orange-600
        to: '#fb923c', // orange-400
        darkFrom: '#fb923c', // orange-400
        darkTo: '#fdba74', // orange-300
      };
    default:
      return {
        from: '#7c3aed', // violet-600
        to: '#a78bfa', // violet-400
        darkFrom: '#a78bfa', // violet-400
        darkTo: '#c4b5fd', // violet-300
      };
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
  const colors = getPhaseGradientColors(phase);
  const gradientId = `gradient-${phase || 'default'}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <span className={`relative inline-block ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <motion.stop
              offset="0%"
              stopColor={colors.from}
              className="dark:hidden"
              animate={{
                stopColor: [colors.from, colors.to, colors.from],
              }}
              transition={{
                duration: animationDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.stop
              offset="50%"
              stopColor={colors.to}
              className="dark:hidden"
              animate={{
                stopColor: [colors.to, colors.from, colors.to],
              }}
              transition={{
                duration: animationDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: animationDuration * 0.25,
              }}
            />
            <motion.stop
              offset="100%"
              stopColor={colors.from}
              className="dark:hidden"
              animate={{
                stopColor: [colors.from, colors.to, colors.from],
              }}
              transition={{
                duration: animationDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: animationDuration * 0.5,
              }}
            />
            {/* Dark mode gradient */}
            <motion.stop
              offset="0%"
              stopColor={colors.darkFrom}
              className="hidden dark:block"
              animate={{
                stopColor: [colors.darkFrom, colors.darkTo, colors.darkFrom],
              }}
              transition={{
                duration: animationDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.stop
              offset="50%"
              stopColor={colors.darkTo}
              className="hidden dark:block"
              animate={{
                stopColor: [colors.darkTo, colors.darkFrom, colors.darkTo],
              }}
              transition={{
                duration: animationDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: animationDuration * 0.25,
              }}
            />
            <motion.stop
              offset="100%"
              stopColor={colors.darkFrom}
              className="hidden dark:block"
              animate={{
                stopColor: [colors.darkFrom, colors.darkTo, colors.darkFrom],
              }}
              transition={{
                duration: animationDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: animationDuration * 0.5,
              }}
            />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="relative z-10 font-medium"
        style={{
          background: `url(#${gradientId})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {text}
      </span>
    </span>
  );
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
