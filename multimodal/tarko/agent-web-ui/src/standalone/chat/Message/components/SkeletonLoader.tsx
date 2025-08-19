import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

/**
 * SkeletonLoader Component - Provides visual feedback during TTFT
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  lines = 3,
  showAvatar = true,
  className = '',
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex space-x-4">
        {showAvatar && (
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          {Array.from({ length: lines }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, width: '0%' }}
              animate={{ opacity: 1, width: '100%' }}
              transition={{
                delay: index * 0.2,
                duration: 0.8,
                ease: 'easeOut',
              }}
              className="space-y-2"
            >
              <div
                className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
                style={{
                  width: index === lines - 1 ? '75%' : '100%',
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * TypewriterLoader Component - Simulates typing effect
 */
interface TypewriterLoaderProps {
  text: string;
  speed?: number;
  className?: string;
}

export const TypewriterLoader: React.FC<TypewriterLoaderProps> = ({
  text,
  speed = 50,
  className = '',
}) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <div className={`font-mono ${className}`}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className="ml-1"
      >
        |_
      </motion.span>
    </div>
  );
};
