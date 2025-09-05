import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

/**
 * ScrollToBottomButton Component - Elegant pure black button matching message-user style
 * 
 * Features:
 * - Pure black design (#141414) matching message-user aesthetic
 * - Refined typography and spacing
 * - Sophisticated hover interactions
 * - Positioned above the input area
 */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ show, onClick }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ 
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94] // Custom cubic-bezier for elegance
          }}
          className="absolute -top-16 right-4 z-50"
        >
          <motion.button
            whileHover={{ 
              scale: 1.08, 
              y: -3,
              transition: { duration: 0.2 }
            }}
            whileTap={{ 
              scale: 0.96,
              transition: { duration: 0.1 }
            }}
            onClick={onClick}
            className="
              relative flex items-center justify-center 
              w-11 h-11 
              bg-[#141414] dark:bg-gray-900
              hover:bg-[#1a1a1a] dark:hover:bg-gray-800
              rounded-2xl
              shadow-lg hover:shadow-2xl
              border border-gray-800/50 dark:border-gray-700/50
              hover:border-gray-700/70 dark:hover:border-gray-600/70
              transition-all duration-300 ease-out
              group
            "
            aria-label="Scroll to bottom"
          >
            {/* Subtle inner highlight */}
            <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.06] dark:via-white/[0.01] dark:to-white/[0.03]" />
            
            {/* Icon with sophisticated animation */}
            <motion.div
              animate={{ 
                y: [0, -1, 0],
                transition: { 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: 'easeInOut',
                  repeatDelay: 2
                }
              }}
              className="relative z-10"
            >
              <FiChevronDown 
                size={18} 
                className="text-white/90 group-hover:text-white transition-all duration-200 drop-shadow-sm" 
                strokeWidth={2.5}
              />
            </motion.div>
            
            {/* Elegant hover glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ 
                opacity: 0.06, 
                scale: 1,
                transition: { duration: 0.3 }
              }}
              className="absolute inset-0 rounded-2xl bg-white"
            />
            
            {/* Outer glow on hover */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ 
                opacity: 0.4,
                transition: { duration: 0.3 }
              }}
              className="absolute -inset-1 rounded-2xl bg-gradient-to-t from-black/20 to-transparent blur-sm -z-10"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
