import React from 'react';
import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Minimal and elegant loading state
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
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
      <div className="text-center">
        {/* Simplified icon */}
        <motion.div variants={iconVariants} className="mb-6">
          <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-gray-100 dark:border-gray-700">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="text-gray-500 dark:text-gray-400"
            >
              <FiLoader size={20} />
            </motion.div>
          </div>
        </motion.div>

        {/* Minimal title */}
        <motion.h2
          variants={itemVariants}
          className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100"
        >
          Preparing session
        </motion.h2>

        {/* Simple description */}
        <motion.p
          variants={itemVariants}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          Just a moment...
        </motion.p>
      </div>
    </motion.div>
  );
};
