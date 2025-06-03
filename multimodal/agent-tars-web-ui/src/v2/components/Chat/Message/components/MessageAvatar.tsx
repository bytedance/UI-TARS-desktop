import React from 'react';
import { FiUser, FiMessageSquare, FiMonitor, FiInfo } from 'react-icons/fi';

interface MessageAvatarProps {
  role: string;
}

/**
 * Component for displaying role-specific avatars
 * 
 * Design principles:
 * - Consistent sizing and styling across different roles
 * - Visual differentiation between message sources
 * - Role-appropriate iconography
 */
export const MessageAvatar: React.FC<MessageAvatarProps> = ({ role }) => {
  if (role === 'user') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/30">
        <FiUser size={14} />
      </div>
    );
  } else if (role === 'assistant') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-accent-50 dark:bg-gray-800 text-accent-500 dark:text-accent-400 border border-accent-200/50 dark:border-gray-700/30">
        <FiMessageSquare size={14} />
      </div>
    );
  } else if (role === 'environment') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50/70 dark:bg-blue-800/50 text-blue-500 dark:text-blue-400 border border-blue-200/40 dark:border-blue-700/20">
        <FiMonitor size={14} />
      </div>
    );
  } else {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100/70 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border border-gray-200/40 dark:border-gray-700/20">
        <FiInfo size={14} />
      </div>
    );
  }
};
