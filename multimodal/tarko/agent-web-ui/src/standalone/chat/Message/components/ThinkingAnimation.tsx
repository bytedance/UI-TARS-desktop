import React from 'react';
import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';
import { AgentProcessingPhase } from '@tarko/interface';
import { getAgentTitle } from '@/config/web-ui-config';

interface ThinkingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  phase?: AgentProcessingPhase;
  estimatedTime?: string;
  showProgress?: boolean;
}

/**
 * GradientText Component - Creates fast left-to-right color gradient effect
 */
interface GradientTextProps {
  text: string;
  className?: string;
}

const GradientText: React.FC<GradientTextProps> = ({ text, className = '' }) => {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Base text */}
      <span className="font-medium text-gray-700 dark:text-gray-300">{text}</span>

      {/* Animated gradient overlay */}
      <motion.span
        className="absolute inset-0 font-medium bg-gradient-to-r from-gray-700 from-30% via-gray-300 via-50% to-gray-700 to-70% dark:from-gray-300 dark:from-30% dark:via-gray-600 dark:via-50% dark:to-gray-300 dark:to-70% bg-clip-text text-transparent"
        style={{
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {text}
      </motion.span>
    </span>
  );
};

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  size = 'medium',
  text = `${getAgentTitle()} is running`,
  className = '',
}) => {
  const textClass = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base';

  return (
    <div className={`p-3 flex items-center space-x-3 ${className}`}>
      {/* Animated icon */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="text-gray-600 dark:text-gray-400"
      >
        <FiLoader size={size === 'small' ? 14 : size === 'medium' ? 18 : 20} />
      </motion.div>

      <div className="flex-1">
        {/* Main status text with gradient effect */}
        <div className="flex items-center space-x-2">
          <GradientText text={text} className={`${textClass} font-semibold`} />
          <motion.span
            className={`${textClass} text-gray-600 dark:text-gray-400 inline-block font-bold`}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            •••
          </motion.span>
        </div>
      </div>
    </div>
  );
};
