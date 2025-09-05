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
          <motion.div
            whileHover={{ 
              scale: 1.05, 
              y: -2
            }}
            whileTap={{ scale: 0.95 }}
            className="relative overflow-hidden rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {/* Gradient border - matching ChatInput */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 rounded-full animate-border-flow bg-[length:200%_200%]" />
            
            <motion.button
              onClick={onClick}
              className="
                relative flex items-center justify-center 
                w-10 h-10 
                m-[2px] 
                bg-white/90 dark:bg-gray-800/90
                hover:bg-white dark:hover:bg-gray-700/90
                rounded-full 
                backdrop-blur-sm
                transition-all duration-200
                group
              "
              aria-label="Scroll to bottom"
            >
              {/* Glass effect overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/5 to-white/10 dark:via-white/2 dark:to-white/5" />
              
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
                  className="text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" 
                />
              </motion.div>
              
              {/* Subtle hover accent */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.1 }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
