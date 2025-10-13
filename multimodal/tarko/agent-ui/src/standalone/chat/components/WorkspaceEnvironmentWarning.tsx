import React from 'react';
import { FiAlertTriangle, FiEye } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceEnvironmentWarningProps {
  isVisible: boolean;
  sessionWorkspace: string;
  serverWorkspace: string;
}

/**
 * Warning banner component for workspace environment mismatch
 * Displays when session workspace differs from server workspace
 */
export const WorkspaceEnvironmentWarning: React.FC<WorkspaceEnvironmentWarningProps> = ({
  isVisible,
  sessionWorkspace,
  serverWorkspace,
}) => {
  if (!isVisible) return null;

  const getWorkspaceName = (path: string) => {
    if (!path) return 'Unknown';
    return path.split('/').pop() || path;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="mx-4 mb-4 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Warning icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center mt-0.5">
                <FiAlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FiEye size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Preview Mode - Environment Mismatch
                  </h3>
                </div>
                
                <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed mb-3">
                  This session was created in a different workspace environment. 
                  You can view the conversation history, but cannot send new messages.
                </p>
                
                {/* Workspace comparison */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Session:</span>
                    <code className="px-2 py-1 bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 rounded font-mono">
                      {getWorkspaceName(sessionWorkspace)}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Current:</span>
                    <code className="px-2 py-1 bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 rounded font-mono">
                      {getWorkspaceName(serverWorkspace)}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};