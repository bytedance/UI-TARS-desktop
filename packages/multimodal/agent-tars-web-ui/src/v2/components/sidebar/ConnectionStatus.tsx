import React from 'react';
import { motion } from 'framer-motion';
import { ConnectionStatus as IConnectionStatus } from '../../types';

interface ConnectionStatusProps {
  status: IConnectionStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * 连接状态组件
 * 显示当前服务器连接状态和刷新按钮
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* 连接状态指示器 */}
      <div
        className={`h-2 w-2 rounded-full ${
          status.connected
            ? 'bg-green-600 animate-pulse'
            : status.reconnecting
              ? 'bg-yellow-500 animate-ping'
              : 'bg-red-500'
        }`}
        title={
          status.connected
            ? 'Connected to server'
            : status.reconnecting
              ? 'Reconnecting...'
              : 'Disconnected from server'
        }
      />
      <motion.button
        whileHover={{ rotate: 180 }}
        transition={{ duration: 0.3 }}
        onClick={onRefresh}
        disabled={isRefreshing || !status.connected}
        className={`text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-xs transition-all ${
          !status.connected && 'opacity-50 cursor-not-allowed'
        }`}
        title={status.connected ? 'Refresh sessions' : 'Server disconnected'}
      >
        <svg
          className={isRefreshing ? 'animate-spin' : ''}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </motion.button>
    </div>
  );
};
