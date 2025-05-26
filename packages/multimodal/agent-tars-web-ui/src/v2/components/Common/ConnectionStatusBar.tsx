import React from 'react';
import { useSession } from '../../hooks/useSession';
import { FiWifiOff, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

/**
 * ConnectionStatusBar Component - Global connection status indicator
 *
 * Design principles:
 * - Clear visual status with color coding
 * - Prominent action button for reconnection
 * - Smooth animations for status changes
 * - Concise messaging for error details
 */
export const ConnectionStatusBar: React.FC = () => {
  const { connectionStatus, checkServerStatus } = useSession();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-5 rounded-3xl overflow-hidden border-l-4 border-l-red-500 dark:border-l-red-600 
                 bg-gradient-to-r from-red-50/90 to-red-100/70 dark:from-red-900/20 dark:to-red-900/10 
                 text-red-700 dark:text-red-400 shadow-md"
    >
      <div className="px-5 py-4 flex items-center">
        {connectionStatus.reconnecting ? (
          <FiRefreshCw className="text-xl mr-4 animate-spin text-red-500 dark:text-red-400" />
        ) : (
          <FiWifiOff className="text-xl mr-4 text-red-500 dark:text-red-400" />
        )}

        <div className="flex-1">
          <h3 className="font-medium">
            {connectionStatus.reconnecting ? 'Reconnecting to server...' : 'Server connection lost'}
          </h3>
          <p className="text-sm mt-1 text-red-600/80 dark:text-red-400/80">
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
            className="ml-4 px-4 py-2 bg-red-200/80 dark:bg-red-800/30 hover:bg-red-300/80 dark:hover:bg-red-700/40 rounded-xl text-sm font-medium transition-colors"
          >
            Retry Connection
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
