import React from 'react';
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

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  size = 'medium',
  text = `${getAgentTitle()} is running`,
  className = '',
}) => {
  const textClass = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base';

  return (
    <div className={`p-3 flex items-center space-x-3 ${className}`}>
      {/* Animated icon */}
      <div className="text-gray-600 dark:text-gray-400 animate-spin">
        <FiLoader size={size === 'small' ? 14 : size === 'medium' ? 18 : 20} />
      </div>

      <div className="flex-1">
        {/* Main status text */}
        <div className="flex items-center space-x-2">
          <span className={`${textClass} font-semibold text-gray-700 dark:text-gray-300`}>
            {text}
          </span>
          <span
            className={`${textClass} text-gray-600 dark:text-gray-400 inline-block font-bold animate-pulse`}
          >
            •••
          </span>
        </div>
      </div>
    </div>
  );
};
