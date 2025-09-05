import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

/**
 * ScrollToBottomButton Component - Subtle floating button to scroll to bottom of chat
 * 
 * Features:
 * - Minimal design with subtle glass effect
 * - Gentle animations and micro-interactions
 * - Elegant visibility without being intrusive
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
              scale: 1.05, 
              y: -2
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="
              relative flex items-center justify-center 
              w-10 h-10 
              bg-white/90 dark:bg-gray-800/90
              hover:bg-white dark:hover:bg-gray-700
              rounded-full 
              shadow-lg hover:shadow-xl
              border-2 border-gray-300 dark:border-gray-500
              hover:border-gray-400 dark:hover:border-gray-400
              backdrop-blur-md
              transition-all duration-200
              group
            "
            aria-label="Scroll to bottom"
          >
            {/* Subtle glass effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/8 to-white/15 dark:via-white/3 dark:to-white/8" />
            
            {/* Icon with gentle animation */}
            <motion.div
              animate={{ y: [0, 1, 0] }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatDelay: 2
              }}
              className="relative z-10"
            >
              <FiChevronDown 
                size={16} 
                className="text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" 
              />
            </motion.div>
            
            {/* Subtle hover glow */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.08 }}
              className="absolute inset-0 rounded-full bg-gray-900 dark:bg-gray-100"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
