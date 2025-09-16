import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration, MarkdownRenderer } from '@tarko/ui';
import { FiLoader } from 'react-icons/fi';
import { PiBrain } from 'react-icons/pi';

interface ModernThinkingToggleProps {
  thinking: string;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
  duration?: number;
  isStreaming?: boolean;
}

/**
 * Modern thinking component with streaming states and real-time duration tracking
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
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    if (isStreaming && !duration) {
      const interval = setInterval(() => {
        setLocalDuration(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isStreaming, duration, startTime]);

  useEffect(() => {
    // Mark initial render as complete after first render
    setIsInitialRender(false);
  }, []);

  const displayDuration = duration || localDuration;
  const isThinking = isStreaming && !duration;

  return (
    <div className="mb-3">
      <motion.button
        onClick={() => setShowThinking(!showThinking)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors group"
        whileHover={{ x: 2 }}
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-amber-500 dark:text-amber-400"
            >
              <FiLoader size={14} />
            </motion.div>
          ) : (
            <motion.div
              animate={{
                scale: showThinking ? 1.1 : 1,
                rotate: showThinking ? 5 : 0,
              }}
              transition={{ duration: 0.2 }}
              className="text-purple-500 dark:text-purple-400"
            >
              <PiBrain size={14} />
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

      <AnimatePresence>
        {showThinking && (
          <motion.div
            initial={isInitialRender ? { height: 'auto' } : { height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={isInitialRender ? { duration: 0 } : { duration: 0.3, ease: 'easeInOut' }}
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
