import React from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiZap } from 'react-icons/fi';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Modern, elegant loading state with quality and emotional value
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const iconContainerVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const floatingDots = {
    float: {
      y: [-8, 8, -8],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  if (!isCreating) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        {/* Enhanced icon with modern design */}
        <motion.div variants={iconContainerVariants} className="relative mb-8">
          {/* Background glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-full blur-xl"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Main icon container */}
          <motion.div
            className="relative w-20 h-20 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm"
            variants={pulseVariants}
            animate="pulse"
          >
            {/* Icon */}
            <div className="relative z-10">
              <motion.div
                animate={{
                  rotate: [0, 180, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-blue-600 dark:text-blue-400"
              >
                <FiMessageSquare size={28} />
              </motion.div>
            </div>

            {/* Accent dot */}
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Floating decorative elements */}
          <motion.div
            className="absolute -top-2 -left-2 w-2 h-2 bg-blue-400/60 rounded-full"
            variants={floatingDots}
            animate="float"
          />
          <motion.div
            className="absolute -bottom-2 -right-2 w-1.5 h-1.5 bg-purple-400/60 rounded-full"
            variants={floatingDots}
            animate="float"
            transition={{ delay: 1 }}
          />
        </motion.div>

        {/* Enhanced title with gradient */}
        <motion.h2
          variants={itemVariants}
          className="text-2xl font-semibold mb-3 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight"
        >
          Preparing your session
        </motion.h2>

        {/* Elegant description */}
        <motion.p
          variants={itemVariants}
          className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed"
        >
          Setting up your Agent workspace with care
        </motion.p>

        {/* Modern progress indicator */}
        <motion.div variants={itemVariants} className="flex items-center justify-center space-x-2">
          <div className="flex space-x-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                animate={{
                  scale: [0.8, 1.3, 0.8],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Subtle accent */}
          <motion.div
            className="ml-4 text-blue-500/60 dark:text-blue-400/60"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FiZap size={14} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
