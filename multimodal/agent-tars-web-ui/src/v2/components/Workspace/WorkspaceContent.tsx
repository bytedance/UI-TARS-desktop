import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { usePlan } from '../../hooks/usePlan';
import { usePro } from '../../hooks/usePro';
import { FiLayout, FiCpu, FiCheck, FiClock, FiZap, FiArrowRight } from 'react-icons/fi';
import './Workspace.css';

/**
 * WorkspaceContent Component - Enhanced workspace with beautiful empty state
 *
 * Design principles:
 * - Focus on plan display for Pro users
 * - Beautiful empty state when no content is available
 * - Clean visual hierarchy and elegant animations
 */
export const WorkspaceContent: React.FC = () => {
  const { activeSessionId, setActivePanelContent } = useSession();
  const { currentPlan } = usePlan(activeSessionId);
  const isProMode = usePro();

  // Animation variants
  const emptyStateVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
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

  // Enhanced empty state when no session
  if (!activeSessionId) {
    return (
      <motion.div
        variants={emptyStateVariants}
        initial="initial"
        animate="animate"
        className="flex items-center justify-center h-full text-center py-12"
      >
        <div className="max-w-md mx-auto px-6">
          <motion.div
            variants={itemVariants}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mx-auto mb-6 border border-gray-200/50 dark:border-gray-700/30"
          >
            <FiLayout size={36} className="text-gray-500 dark:text-gray-400" />
          </motion.div>
          
          <motion.h3 
            variants={itemVariants}
            className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200"
          >
            No Active Session
          </motion.h3>
          
          <motion.p 
            variants={itemVariants}
            className="text-gray-600 dark:text-gray-400 leading-relaxed"
          >
            Create or select a session to start working. Tool results and detailed information will be displayed here automatically.
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // Enhanced empty state when session exists but no content
  const hasContent = currentPlan && currentPlan.hasGeneratedPlan && currentPlan.steps.length > 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="w-8 h-8 mr-3 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-[#E5E6EC] dark:border-gray-700/30">
          <FiLayout size={16} />
        </div>
        <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">Workspace</h2>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {hasContent ? (
          <div className="space-y-8">
            {/* Plan view for Pro users */}
            {renderPlanButton()}
          </div>
        ) : (
          /* Beautiful empty state for active session with no content */
          <motion.div
            variants={emptyStateVariants}
            initial="initial"
            animate="animate"
            className="flex items-center justify-center h-full text-center"
          >
            <div className="max-w-lg mx-auto px-6">
              <motion.div
                variants={itemVariants}
                className="relative mb-8"
              >
                {/* Animated background circles */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-accent-200 to-accent-300 dark:from-accent-800 dark:to-accent-700 mx-auto"
                />
                <motion.div
                  animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-700 mx-auto mt-2 ml-2"
                />
                
                {/* Main icon */}
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mx-auto border-2 border-gray-200/50 dark:border-gray-700/30 shadow-lg">
                  <FiZap size={40} className="text-accent-500 dark:text-accent-400" />
                </div>
              </motion.div>
              
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200"
              >
                Ready to Work
              </motion.h3>
              
              <motion.p 
                variants={itemVariants}
                className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6"
              >
                Your workspace is ready! Start a conversation with Agent TARS and watch as tool results, plans, and detailed information appear here automatically.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 gap-4 max-w-sm mx-auto"
              >
                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100/50 dark:border-gray-700/30">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 text-blue-600 dark:text-blue-400">
                    <FiLayout size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Tool Results</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">View detailed outputs</div>
                  </div>
                </div>

                {isProMode && (
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100/50 dark:border-gray-700/30">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3 text-purple-600 dark:text-purple-400">
                      <FiCpu size={16} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Task Plans</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Track progress</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100/50 dark:border-gray-700/30">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 text-green-600 dark:text-green-400">
                    <FiArrowRight size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Live Updates</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Real-time results</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
