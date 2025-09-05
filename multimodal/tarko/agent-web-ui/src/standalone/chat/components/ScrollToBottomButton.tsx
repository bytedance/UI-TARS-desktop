import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

/**
 * ScrollToBottomButton Component - Modern gradient button matching ChatInput style
 * 
 * Features:
 * - Gradient border design matching ChatInput aesthetic
 * - Glass morphism background effect
 * - Smooth animations and micro-interactions
 * - Positioned above the input area
 */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ show, onClick }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ 
            duration: 0.3,
            ease: 'easeOut'
          }}
          className="absolute -top-10 right-4 z-50"
        >
          <motion.button
            whileHover={{ 
              scale: 1.02, 
              y: -1
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="
              relative flex items-center justify-center 
              w-10 h-10 
              bg-white/80 dark:bg-gray-800/80
              hover:bg-white/95 dark:hover:bg-gray-700/95
              rounded-full 
              shadow-md hover:shadow-lg
              border border-gray-300/50 dark:border-gray-600/50
              hover:border-gray-400/70 dark:hover:border-gray-500/70
              backdrop-blur-sm
              transition-all duration-200
              group
            "
            aria-label="Scroll to bottom"
          >
            {/* Subtle glass effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/3 to-white/6 dark:via-white/1 dark:to-white/3" />
            
            {/* Icon with minimal animation */}
            <motion.div
              animate={{ y: [0, 0.5, 0] }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatDelay: 3
              }}
              className="relative z-10"
            >
              <FiChevronDown 
                size={16} 
                className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" 
              />
            </motion.div>
            
            {/* Gentle hover hint */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.1 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
