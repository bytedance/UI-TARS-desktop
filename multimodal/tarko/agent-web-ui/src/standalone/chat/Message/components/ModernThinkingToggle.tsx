import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiLoader } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';

interface ModernThinkingToggleProps {
  thinking: string;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
  duration?: number;
  isStreaming?: boolean;
}

/**
 * Modern thinking component with streaming states
 * 
 * Shows "Thinking" with animation during streaming
 * Shows "Thought for {x}s" after completion
 */
export const ModernThinkingToggle: React.FC<ModernThinkingToggleProps> = ({
  thinking,
  showThinking,
  setShowThinking,
  duration,
  isStreaming = false,
}) => {
  const [localDuration, setLocalDuration] = useState(0);
  const [startTime] = useState(Date.now());

  // Update local duration during streaming
  useEffect(() => {
    if (isStreaming && !duration) {
      const interval = setInterval(() => {
        setLocalDuration(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isStreaming, duration, startTime]);

  // Format duration display
  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };

  const displayDuration = duration || localDuration;
  const isThinking = isStreaming && !duration;

  return (
    <div className="mb-3">
      {/* Toggle header */}
      <motion.button
        onClick={() => setShowThinking(!showThinking)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors group"
        whileHover={{ x: 2 }}
      >
        <motion.div animate={{ rotate: showThinking ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronRight size={14} />
        </motion.div>
        
        <div className="flex items-center gap-2">
          {isThinking && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-gray-500 dark:text-gray-400"
            >
              <FiLoader size={12} />
            </motion.div>
          )}
          
          <span className="font-medium text-[16px]">
            {isThinking ? (
              <span className="flex items-center gap-1">
                Thinking
                <motion.span
                  className="inline-block font-bold"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  •••
                </motion.span>
              </span>
            ) : (
              `Thought${displayDuration > 0 ? ` for ${formatDuration(displayDuration)}` : ''}`
            )}
          </span>
        </div>
      </motion.button>

      {/* Thinking content */}
      <AnimatePresence>
        {showThinking && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 ml-6 prose dark:prose-invert prose-sm max-w-none text-xs">
              <MarkdownRenderer content={thinking} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
