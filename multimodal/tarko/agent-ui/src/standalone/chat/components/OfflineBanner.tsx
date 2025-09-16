import React from 'react';
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
    <div className="mb-6 p-4 bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-900/20 dark:to-orange-900/20 backdrop-blur-sm text-red-700 dark:text-red-300 text-sm rounded-2xl border border-red-200/40 dark:border-red-700/40 shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">
            <FiWifiOff className="text-red-500 dark:text-red-400" size={18} />
          </div>

          <div className="flex-1">
            <div className="font-medium text-red-800 dark:text-red-200 mb-1">
              Viewing in offline mode
            </div>
            <div className="text-red-600 dark:text-red-300 text-xs leading-relaxed">
              You can view previous messages but cannot send new ones until reconnected.
            </div>
          </div>
        </div>

        {/* Reconnect button */}
        <button
          onClick={onReconnect}
          disabled={connectionStatus.reconnecting}
          className="ml-4 px-4 py-2 bg-red-100/80 dark:bg-red-800/40 hover:bg-red-200/80 dark:hover:bg-red-700/50 disabled:hover:bg-red-100/80 dark:disabled:hover:bg-red-800/40 rounded-xl text-xs font-medium transition-all duration-200 flex items-center border border-red-200/50 dark:border-red-700/50 shadow-sm hover:shadow-md disabled:cursor-not-allowed hover:scale-105 hover:-translate-y-0.5 active:scale-95"
        >
          <div className={`mr-2 ${connectionStatus.reconnecting ? 'animate-spin' : ''}`}>
            <FiRefreshCw size={14} />
          </div>
          {connectionStatus.reconnecting ? 'Reconnecting...' : 'Reconnect'}
        </button>
      </div>
    </div>
  );
};
