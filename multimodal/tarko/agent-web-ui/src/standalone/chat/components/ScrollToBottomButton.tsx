import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

/**
 * ScrollToBottomButton Component - Floating button to scroll to bottom of chat
 * 
 * Features:
 * - Smooth fade in/out animation
 * - Gradient background for visibility
 * - Hover and tap animations
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
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute -top-16 right-4 z-50"
        >
          {/* Gradient backdrop for better visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/60 to-transparent dark:from-gray-900/80 dark:via-gray-900/60 dark:to-transparent rounded-full blur-sm scale-110" />
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="relative flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full shadow-lg border border-gray-200/50 dark:border-gray-600/50 transition-colors group"
            aria-label="Scroll to bottom"
          >
            <motion.div
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FiChevronDown 
                size={18} 
                className="text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors" 
              />
            </motion.div>
            
            {/* Subtle pulse effect */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-accent-500/20 dark:bg-accent-400/20 rounded-full"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
