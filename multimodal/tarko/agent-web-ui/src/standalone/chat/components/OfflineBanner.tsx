import React from 'react';
import { motion } from 'framer-motion';
import { FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import { ConnectionStatus } from '@/common/hooks/useSession';

interface OfflineBannerProps {
  connectionStatus: ConnectionStatus;
  currentSessionId: string | null;
  isReplayMode: boolean;
  onReconnect: () => void;
}

/**
 * OfflineBanner Component - Displays offline status with reconnect option
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  connectionStatus,
  currentSessionId,
  isReplayMode,
  onReconnect,
}) => {
  // Don't show banner if connected, no session, creating session, or in replay mode
  if (
    connectionStatus.connected ||
    !currentSessionId ||
    currentSessionId === 'creating' ||
    isReplayMode
  ) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-6 p-4 bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-900/20 dark:to-orange-900/20 backdrop-blur-sm text-red-700 dark:text-red-300 text-sm rounded-2xl border border-red-200/40 dark:border-red-700/40 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3">
          {/* Icon with subtle animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-0.5"
          >
            <FiWifiOff className="text-red-500 dark:text-red-400" size={18} />
          </motion.div>

          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="font-medium text-red-800 dark:text-red-200 mb-1"
            >
              Viewing in offline mode
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-red-600 dark:text-red-300 text-xs leading-relaxed"
            >
              You can view previous messages but cannot send new ones until reconnected.
            </motion.div>
          </div>
        </div>

        {/* Reconnect button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReconnect}
          disabled={connectionStatus.reconnecting}
          className="ml-4 px-4 py-2 bg-red-100/80 dark:bg-red-800/40 hover:bg-red-200/80 dark:hover:bg-red-700/50 disabled:hover:bg-red-100/80 dark:disabled:hover:bg-red-800/40 rounded-xl text-xs font-medium transition-all duration-200 flex items-center border border-red-200/50 dark:border-red-700/50 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          <motion.div
            animate={connectionStatus.reconnecting ? { rotate: 360 } : { rotate: 0 }}
            transition={
              connectionStatus.reconnecting
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : { duration: 0.2 }
            }
            className="mr-2"
          >
            <FiRefreshCw size={14} />
          </motion.div>
          {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
        </motion.button>
      </div>
    </motion.div>
  );
};
