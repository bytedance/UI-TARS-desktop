import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

/**
 * ScrollToBottomButton Component - Elegant floating button to scroll to bottom of chat
 * 
 * Features:
 * - Elegant design with gradient background and glass effect
 * - Smooth animations and micro-interactions
 * - High visibility with subtle shadows and borders
 * - Positioned above the input area
 */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({ show, onClick }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ 
            type: 'spring',
            stiffness: 500,
            damping: 30,
            mass: 1
          }}
          className="absolute -top-20 right-6 z-50"
        >
          <motion.button
            whileHover={{ 
              scale: 1.1, 
              y: -4,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="
              relative flex items-center justify-center 
              w-12 h-12 
              bg-gradient-to-br from-blue-500 to-purple-600 
              dark:from-blue-600 dark:to-purple-700
              hover:from-blue-600 hover:to-purple-700
              dark:hover:from-blue-700 dark:hover:to-purple-800
              rounded-full 
              shadow-xl 
              border border-white/20 dark:border-gray-700/50
              backdrop-blur-sm
              transition-all duration-200
              group
            "
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(147, 51, 234, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
            }}
            aria-label="Scroll to bottom"
          >
            {/* Glass effect overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20 dark:via-white/5 dark:to-white/10" />
            
            {/* Icon with bounce animation */}
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut',
                repeatDelay: 1
              }}
              className="relative z-10"
            >
              <FiChevronDown 
                size={20} 
                className="text-white drop-shadow-sm group-hover:drop-shadow-md transition-all" 
              />
            </motion.div>
            
            {/* Subtle rotating ring effect */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-white/30 dark:border-white/20"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1), transparent)'
              }}
            />
            
            {/* Pulse effect on hover */}
            <motion.div
              initial={{ scale: 1, opacity: 0 }}
              whileHover={{ scale: 1.5, opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-white/20"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
