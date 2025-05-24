import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus } from '../../types';

interface ConnectionAlertProps {
  serverConnectionStatus: ConnectionStatus;
}

/**
 * 连接警报组件
 * 在服务器断开连接时显示警报
 */
export const ConnectionAlert: React.FC<ConnectionAlertProps> = ({ serverConnectionStatus }) => {
  if (serverConnectionStatus.connected) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800/20"
      >
        <div className="font-medium mb-1">Server disconnected</div>
        <div className="text-sm mt-1">
          {serverConnectionStatus.reconnecting
            ? 'Attempting to reconnect...'
            : 'Please check your connection and try again.'}
        </div>
        {serverConnectionStatus.lastError && (
          <div className="text-xs mt-1 opacity-80">{serverConnectionStatus.lastError}</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
