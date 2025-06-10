import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { usePlan } from '../../hooks/usePlan';
import { usePro } from '../../hooks/usePro';
import { FiLayout, FiCpu, FiCheck, FiClock } from 'react-icons/fi';
import './Workspace.css';

/**
 * WorkspaceContent Component - Simplified workspace without tool list
 *
 * Design principles:
 * - Focus on plan display for Pro users
 * - Clean empty state when no active session
 * - Removed tool listing to avoid complexity and bugs
 */
export const WorkspaceContent: React.FC = () => {
  const { activeSessionId, setActivePanelContent } = useSession();
  const { currentPlan } = usePlan(activeSessionId);
  const isProMode = usePro();

  // Animation variants
  const emptyStateVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, delay: 0.1 },
    },
  };

  // Plan view button for Pro users
  const renderPlanButton = () => {
    if (!isProMode) return null;

    if (!currentPlan || !currentPlan.hasGeneratedPlan || currentPlan.steps.length === 0)
      return null;

    const completedSteps = currentPlan.steps.filter((step) => step.done).length;
    const totalSteps = currentPlan.steps.length;
    const isComplete = currentPlan.isComplete;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <motion.div
          whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setActivePanelContent({
              type: 'plan',
              source: null,
              title: 'Task Plan',
              timestamp: Date.now(),
            })
          }
          className="bg-white dark:bg-gray-800 rounded-xl border border-[#E5E6EC] dark:border-gray-700/30 overflow-hidden cursor-pointer transition-all duration-200"
        >
          <div className="p-4">
            <div className="flex items-start">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 ${
                  isComplete
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100/50 dark:border-green-800/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-accent-500 dark:text-accent-400 border border-[#E5E6EC] dark:border-gray-700/30'
                }`}
              >
                {isComplete ? (
                  <FiCpu size={18} />
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FiCpu size={18} />
                  </motion.div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate pr-2">
                    Task Plan
                  </h4>
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <FiClock size={12} className="mr-1" />
                  {isComplete ? 'Completed' : 'In progress'}
                </div>

                {/* Progress bar */}
                <div className="mt-3 mb-2">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isComplete
                          ? 'bg-gradient-to-r from-green-400 to-green-500'
                          : 'bg-gradient-to-r from-accent-400 to-accent-500'
                      }`}
                      style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 border-t border-[#E5E6EC] dark:border-gray-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs">
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isComplete
                      ? 'bg-green-500 dark:bg-green-400'
                      : 'bg-accent-500 dark:bg-accent-400'
                  }`}
                />
                <span className="text-gray-500 dark:text-gray-400">View plan details</span>
              </div>
              <div className="flex items-center text-xs">
                {isComplete ? (
                  <span className="text-gray-500 dark:text-gray-400 flex items-center">
                    <FiCheck size={12} className="mr-1 text-green-500 dark:text-green-400" />
                    Complete
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 flex items-center">
                    <FiClock size={12} className="mr-1" />
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center px-6 py-4">
        <div className="w-8 h-8 mr-3 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-[#E5E6EC] dark:border-gray-700/30">
          <FiLayout size={16} />
        </div>
        <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">Workspace</h2>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!activeSessionId ? (
          <motion.div
            variants={emptyStateVariants}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4 border border-[#E5E6EC] dark:border-gray-700/30">
              <FiLayout size={32} />
            </div>
            <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
              No active session
            </h3>
            <p className="text-sm max-w-md">
              Create or select a session to start working. Tool results will be displayed here automatically.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Plan view for Pro users */}
            {renderPlanButton()}

            {/* Info about workspace functionality */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100/50 dark:border-gray-700/30"
            >
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                Workspace Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Tool results and detailed information will be displayed here automatically when you interact with the agent. 
                Click on any tool call in the chat to view its details in this workspace.
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
