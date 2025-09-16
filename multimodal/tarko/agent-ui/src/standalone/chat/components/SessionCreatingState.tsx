import React from 'react';
import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';

interface SessionCreatingStateProps {
  isCreating: boolean;
}

/**
 * SessionCreatingState Component - Enhanced loading state with clear loading indication
 */
export const SessionCreatingState: React.FC<SessionCreatingStateProps> = ({ isCreating }) => {

  if (!isCreating) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex items-center justify-center h-full"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        {/* Enhanced loading icon with refined glow */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="relative mb-8"
        >
          {/* Refined background glow - multiple layers for elegance */}
          <motion.div
            className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-blue-500/10 blur-2xl"
            animate={{
              scale: [0.9, 1.1, 0.9],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute inset-2 w-28 h-28 mx-auto rounded-full bg-blue-400/15 blur-xl"
            animate={{
              scale: [1.1, 0.9, 1.1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />

          {/* Main loading container with subtle pulse */}
          <motion.div
            className="relative w-24 h-24 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Clean loading spinner */}
            <div className="relative z-10">
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="text-blue-600 dark:text-blue-400"
              >
                <FiLoader size={32} strokeWidth={2.5} />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Enhanced title with loading emphasis */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-2xl font-semibold mb-3 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight"
        >
          Preparing your session
        </motion.h2>

        {/* More engaging description */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed"
        >
          Setting up your Agent workspace with care...
        </motion.p>

        {/* Enhanced progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex items-center justify-center"
        >
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                animate={{
                  scale: [0.8, 1.4, 0.8],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
