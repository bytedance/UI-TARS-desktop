import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { usePlan } from '../../hooks/usePlan';
import { usePro } from '../../hooks/usePro';
import { FiLayout, FiCpu, FiCheck, FiClock, FiZap, FiArrowRight, FiLayers, FiActivity } from 'react-icons/fi';
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
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] }
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
        variants={itemVariants}
        className="mb-6"
      >
        <motion.div
          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setActivePanelContent({
              type: 'plan',
              source: null,
              title: 'Task Plan',
              timestamp: Date.now(),
            })
          }
          className="bg-white dark:bg-gray-800/90 rounded-2xl border border-[#E5E6EC]/70 dark:border-gray-700/40 overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
        >
          <div className="p-5">
            <div className="flex items-start">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0 ${
                  isComplete
                    ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-600 dark:text-green-400 border border-green-100/80 dark:border-green-800/40'
                    : 'bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 text-accent-500 dark:text-accent-400 border border-accent-100/50 dark:border-accent-800/30'
                }`}
              >
                {isComplete ? (
                  <FiCpu size={24} />
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FiCpu size={24} />
                  </motion.div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-lg mb-1 truncate pr-2">
                    Task Plan
                  </h4>
                  <div className="flex items-center text-xs">
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        isComplete
                          ? 'bg-green-500 dark:bg-green-400'
                          : 'bg-accent-500 dark:bg-accent-400'
                      }`}
                    />
                    <span className="text-gray-500 dark:text-gray-400">
                      {isComplete ? 'Completed' : 'In progress'}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {isComplete 
                    ? 'All planned steps have been completed successfully.' 
                    : 'The agent is executing a plan to accomplish your task.'}
                </div>

                {/* Progress bar */}
                <div className="mt-1 mb-2">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isComplete
                          ? 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-400'
                          : 'bg-gradient-to-r from-accent-400 to-accent-500 dark:from-accent-500 dark:to-accent-400'
                      }`}
                      style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50/70 to-gray-50 dark:from-gray-800/50 dark:to-gray-800/80 px-5 py-3 border-t border-[#E5E6EC]/50 dark:border-gray-700/30 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              View plan details
            </div>
            <div className="flex items-center text-sm">
              <FiArrowRight 
                className="text-accent-500 dark:text-accent-400"
                size={16}
              />
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
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex items-center justify-center h-full text-center py-12"
      >
        <div className="max-w-md mx-auto px-6">
          <motion.div
            variants={itemVariants}
            className="relative mx-auto mb-8"
          >
            {/* Gradient background glow effect */}
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-200/50 to-gray-100/30 dark:from-gray-700/30 dark:to-gray-800/20 blur-xl"></div>
            
            {/* Main icon */}
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
              <FiLayout size={40} className="text-gray-500 dark:text-gray-400" />
            </div>
          </motion.div>
          
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-medium mb-3 text-gray-800 dark:text-gray-200"
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
    <div className="h-full flex flex-col">
      {/* Header with refined styling */}
      <div className="flex items-center px-6 py-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
        <div className="w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
          <FiLayers size={18} />
        </div>
        <div>
          <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">Workspace</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            View tool outputs and plan details
          </div>
        </div>
      </div>

      {/* Content area with elegant empty state */}
      <div className="flex-1 overflow-y-auto p-6">
        {hasContent ? (
          <motion.div 
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {/* Plan view for Pro users */}
            {renderPlanButton()}
          </motion.div>
        ) : (
          /* Beautiful empty state for active session with no content */
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="flex items-center justify-center h-full text-center"
          >
            <div className="max-w-lg mx-auto px-6">
              <motion.div
                variants={itemVariants}
                className="relative mb-10"
              >
                {/* Animated background circles */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1], 
                    opacity: [0.3, 0.5, 0.3],
                    rotate: [0, 5, 0, -5, 0]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-br from-accent-200/30 to-accent-300/20 dark:from-accent-800/20 dark:to-accent-700/10 mx-auto blur-xl"
                />
                <motion.div
                  animate={{ 
                    scale: [1.1, 1, 1.1], 
                    opacity: [0.2, 0.4, 0.2],
                    rotate: [0, -5, 0, 5, 0]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-purple-200/20 to-purple-300/10 dark:from-purple-800/10 dark:to-purple-700/5 mx-auto mt-2 ml-2 blur-xl"
                />
                
                {/* Main icon with glowing effect */}
                <div className="relative mx-auto w-28 h-28 rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <FiActivity size={44} className="text-accent-500 dark:text-accent-400" />
                  </motion.div>
                  
                  {/* Subtle pulsing ring */}
                  <motion.div
                    animate={{ 
                      scale: [0.8, 1.2, 0.8], 
                      opacity: [0.3, 0.1, 0.3] 
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-3xl border-2 border-accent-400/20 dark:border-accent-400/10"
                  />
                </div>
              </motion.div>
              
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-300 bg-clip-text text-transparent"
              >
                Ready for Action
              </motion.h3>
              
              <motion.p 
                variants={itemVariants}
                className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-md mx-auto"
              >
                Your workspace is active. Start a conversation with Agent TARS and watch as tool results, plans, and detailed information appear here in real-time.
              </motion.p>

              <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
              >
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)' }}
                  className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 text-blue-500 dark:text-blue-400 border border-blue-100/80 dark:border-blue-800/30">
                    <FiLayout size={22} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Tool Results</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Comprehensive outputs</div>
                  </div>
                </motion.div>

                {isProMode && (
                  <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)' }}
                    className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3 text-purple-500 dark:text-purple-400 border border-purple-100/80 dark:border-purple-800/30">
                      <FiCpu size={22} />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Task Plans</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Execution progress</div>
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  variants={itemVariants}
                  whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)' }}
                  className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3 text-green-500 dark:text-green-400 border border-green-100/80 dark:border-green-800/30">
                    <FiZap size={22} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Live Updates</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Real-time results</div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
