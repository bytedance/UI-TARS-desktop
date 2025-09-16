import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="absolute -top-10 left-1/2 -translate-x-4 z-50"
        >
          <button
            onClick={onClick}
            className="
              relative flex items-center justify-center 
              w-8 h-8 
              bg-white/70 dark:bg-gray-900/70
              hover:bg-white/80 dark:hover:bg-gray-900/80
              border border-[#F2F3F5]/60 dark:border-gray-900/60
              rounded-full 
              shadow-lg hover:shadow-xl
              backdrop-blur-md
              transition-all duration-200 ease-out
              hover:scale-105 hover:-translate-y-0.5 active:scale-95
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
                repeatDelay: 3,
              }}
              className="relative z-10"
            >
              <FiChevronDown
                size={14}
                className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-200"
              />
            </motion.div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
