import React from 'react';
import { motion } from 'framer-motion';
import { FiMessageSquare } from 'react-icons/fi';

/**
 * LoadingState component - Shows loading state while historical events are being loaded
 */
export const LoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-600">
      <div className="text-center p-8 max-w-lg">
        {/* Loading icon with animation */}
        <div className="relative mb-8 animate-in zoom-in duration-700">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-green-500/15 rounded-full blur-xl animate-pulse" />

          {/* Main icon container */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm">
            {/* Animated icon */}
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
              <FiMessageSquare size={28} />
            </motion.div>
          </div>
        </div>

        {/* Loading title */}
        <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-white dark:to-gray-100 text-transparent bg-clip-text tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-600">
          Loading conversation
        </h3>

        {/* Loading description */}
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto animate-in slide-in-from-bottom-4 fade-in duration-600 delay-150">
          Loading historical events for this conversation...
        </p>
      </div>
    </div>
  );
};