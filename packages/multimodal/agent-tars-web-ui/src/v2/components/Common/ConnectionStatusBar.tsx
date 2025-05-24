import React from 'react';
import { useSession } from '../../hooks/useSession';
import { FiWifiOff, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

/**
 * ConnectionStatusBar Component - Global connection status indicator
 *
 * Provides:
 * - Visual feedback for connection status
 * - Retry button for reconnection
 * - Error details display
 */
export const ConnectionStatusBar: React.FC = () => {
  const { connectionStatus, checkServerStatus } = useSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-5 rounded-2xl overflow-hidden border-l-4 border-l-red-400 dark:border-l-red-600 
                 bg-gradient-to-r from-red-50 to-red-50/70 dark:from-red-900/20 dark:to-red-900/10 
                 text-red-700 dark:text-red-400 shadow-sm"
    >
      <div className="px-5 py-4 flex items-center">
        {connectionStatus.reconnecting ? (
          <FiRefreshCw className="text-xl mr-4 animate-spin" />
        ) : (
          <FiWifiOff className="text-xl mr-4" />
        )}

        <div className="flex-1">
          <h3 className="font-medium">
            {connectionStatus.reconnecting ? 'Reconnecting to server...' : 'Server connection lost'}
          </h3>
          <p className="text-sm mt-1 text-red-600/90 dark:text-red-400/90">
            {connectionStatus.reconnecting
              ? 'Attempting to reestablish connection'
              : connectionStatus.lastError || 'Please check your connection and try again'}
          </p>
        </div>

        {!connectionStatus.reconnecting && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => checkServerStatus()}
            className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-700/40 rounded-xl text-sm font-medium transition-colors"
          >
            Retry Connection
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
