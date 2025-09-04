import React from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiLoader } from 'react-icons/fi';
import { getAgentTitle } from '@/config/web-ui-config';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Elegant loading and welcome state
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800"
    >
      <div className="text-center p-8 max-w-lg">
        {/* Icon with enhanced animation */}
        <motion.div variants={iconVariants} className="relative mb-8 mx-auto">
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-gray-100/80 dark:border-gray-700/50"
            variants={isCreating ? pulseVariants : {}}
            animate={isCreating ? 'pulse' : ''}
          >
            {isCreating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-gray-600 dark:text-gray-300"
              >
                <FiLoader size={28} />
              </motion.div>
            ) : (
              <FiMessageSquare size={28} className="text-gray-600 dark:text-gray-300" />
            )}
          </motion.div>

          {/* Subtle background glow for creating state */}
          {isCreating && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 dark:from-blue-900/10 dark:to-purple-900/10 rounded-3xl -z-10"
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
          )}
        </motion.div>

        {/* Title with improved typography */}
        <motion.h2
          variants={itemVariants}
          className="text-2xl font-display font-bold mb-4 text-gray-900 dark:text-gray-100 tracking-tight"
        >
          {isCreating ? (
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 text-transparent bg-clip-text">
              Preparing your session
            </span>
          ) : (
            `Welcome to ${getAgentTitle()}`
          )}
        </motion.h2>

        {/* Description with better spacing */}
        <motion.p
          variants={itemVariants}
          className="text-gray-600 dark:text-gray-400 mb-8 text-base leading-relaxed max-w-md mx-auto"
        >
          {isCreating
            ? 'Setting up your AI assistant workspace. This will only take a moment.'
            : 'Create a new chat session to get started with your AI assistant.'}
        </motion.p>

        {/* Enhanced info card */}
        <motion.div
          variants={itemVariants}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-100/60 dark:border-gray-700/40 shadow-sm"
        >
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mt-2 flex-shrink-0" />
            <div className="text-left">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {getAgentTitle()} can help with web search, browsing, file operations, and complex
                reasoning tasks.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Loading indicator for creating state */}
        {isCreating && (
          <motion.div
            variants={itemVariants}
            className="mt-6 flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400"
          >
            <motion.div
              className="flex space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
