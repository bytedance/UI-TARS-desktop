import React from 'react';
import { motion } from 'framer-motion';

interface SharedEmptyStateIconProps {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'gray';
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: 'w-16 h-16', icon: 'text-xl' },
  md: { container: 'w-20 h-20', icon: 'text-2xl' },
  lg: { container: 'w-24 h-24', icon: 'text-3xl' },
};

const colorConfig = {
  blue: {
    glow: 'from-blue-500/15 via-purple-500/15 to-green-500/15',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    glow: 'from-green-500/15 via-emerald-500/15 to-teal-500/15',
    icon: 'text-green-600 dark:text-green-400',
  },
  purple: {
    glow: 'from-purple-500/15 via-violet-500/15 to-indigo-500/15',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  gray: {
    glow: 'from-gray-200/50 to-gray-100/30 dark:from-gray-700/30 dark:to-gray-800/20',
    icon: 'text-gray-500 dark:text-gray-400',
  },
};

/**
 * Shared empty state icon component with consistent design
 * Eliminates redundant icon container patterns across components
 */
export const SharedEmptyStateIcon: React.FC<SharedEmptyStateIconProps> = ({
  icon,
  size = 'md',
  color = 'blue',
  animated = true,
  className = '',
}) => {
  const { container, icon: iconSize } = sizeConfig[size];
  const { glow, icon: iconColor } = colorConfig[color];

  const glowAnimation = animated
    ? {
        scale: [0.8, 1.1, 0.8],
        opacity: [0.2, 0.4, 0.2],
      }
    : {};

  const iconAnimation = animated
    ? {
        scale: [1, 1.05, 1],
      }
    : {};

  return (
    <div className={`relative mb-8 ${className}`}>
      {/* Background glow */}
      {animated ? (
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${glow} rounded-full blur-xl`}
          animate={glowAnimation}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-r ${glow} rounded-full blur-xl`} />
      )}

      {/* Main icon container */}
      <motion.div
        className={`relative ${container} bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm`}
        animate={animated ? iconAnimation : {}}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={animated ? { scale: 1.05, y: -2 } : {}}
      >
        {/* Icon */}
        <div className={`relative z-10 ${iconColor}`}>{icon}</div>
      </motion.div>
    </div>
  );
};
