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
          className="absolute -top-16 right-4 z-50"
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
              w-9 h-9 
              bg-white/70 dark:bg-gray-800/70
              hover:bg-white/85 dark:hover:bg-gray-700/85
              rounded-full 
              shadow-sm hover:shadow-md
              border border-gray-200/40 dark:border-gray-600/40
              hover:border-gray-300/60 dark:hover:border-gray-500/60
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
                size={14} 
                className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" 
              />
            </motion.div>
            
            {/* Very subtle hover hint */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.05 }}
              className="absolute inset-0 rounded-full bg-gray-900 dark:bg-gray-100"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
