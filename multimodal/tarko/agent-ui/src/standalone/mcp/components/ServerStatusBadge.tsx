import React from 'react';
import type { MCPServerStatus } from '@/common/types/mcp';

interface ServerStatusBadgeProps {
  status: MCPServerStatus;
  className?: string;
}

export const ServerStatusBadge: React.FC<ServerStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-200 dark:border-green-700',
          dot: 'bg-green-500',
        };
      case 'activating':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-200 dark:border-yellow-700',
          dot: 'bg-yellow-500',
        };
      case 'error':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-200 dark:border-red-700',
          dot: 'bg-red-500',
        };
      case 'inactive':
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-700',
          dot: 'bg-gray-400',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};