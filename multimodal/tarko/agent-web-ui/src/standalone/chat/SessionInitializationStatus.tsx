import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { SessionInitializationStatus } from '@/common/state/atoms/session';

interface SessionInitializationStatusProps {
  status: SessionInitializationStatus;
  sessionId: string;
}

/**
 * Component to display session initialization progress
 */
export const SessionInitializationStatusComponent: React.FC<SessionInitializationStatusProps> = ({
  status,
  sessionId,
}) => {
  // Show if initializing, or if no events but status exists (fallback)
  if (!status.isInitializing && status.events.length === 0 && !status.message) {
    return null;
  }

  const lastEvent = status.events[status.events.length - 1];
  const isError = lastEvent?.type === 'error';
  const isCompleted = lastEvent?.type === 'completed';

  const getStatusIcon = () => {
    if (status.isInitializing) {
      return <FiLoader className="animate-spin text-blue-500" size={16} />;
    }
    if (isError) {
      return <FiAlertCircle className="text-red-500" size={16} />;
    }
    if (isCompleted) {
      return <FiCheckCircle className="text-green-500" size={16} />;
    }
    return <FiLoader className="animate-spin text-blue-500" size={16} />;
  };

  const getStatusColor = () => {
    if (isError) {
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    }
    if (isCompleted) {
      return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
    }
    return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
  };

  const getTitle = () => {
    if (isError) return 'Initialization Failed';
    if (isCompleted) return 'Agent Ready';
    return 'Agent Initializing';
  };

  const getMessage = () => {
    if (isError) return lastEvent?.error || 'An error occurred during initialization';
    if (isCompleted) return 'Agent is ready to accept queries';
    return status.message || 'Setting up MCP servers...';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={`mx-4 mb-4 p-4 rounded-xl border ${getStatusColor()}`}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {getTitle()}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {getMessage()}
            </p>
          </div>
        </div>

        {/* Simple progress bar for initializing sessions */}
        {status.isInitializing && (
          <div className="mt-3">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <motion.div
                className="bg-blue-500 h-1.5 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '70%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
