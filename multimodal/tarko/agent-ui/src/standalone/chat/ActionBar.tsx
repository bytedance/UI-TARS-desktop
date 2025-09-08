import React from 'react';
import { motion } from 'framer-motion';
import { FiCpu } from 'react-icons/fi';
import { useSession } from '@/common/hooks/useSession';
import { usePlan } from '@/common/hooks/usePlan';

interface ActionBarProps {
  sessionId: string | null;
  className?: string;
}

/**
 * ActionBar Component - Manages View Plan functionality
 *
 * Design principles:
 * - Decoupled from MessageInput for better modularity
 * - Independent control over UI presentation
 * - Maintains original functionality and styling
 * - Enhanced visual separation with background styling
 * 
 * Note: Generated Files functionality has been moved to WorkspaceContent
 */
export const ActionBar: React.FC<ActionBarProps> = ({ sessionId, className = '' }) => {
  const { setActivePanelContent } = useSession();
  const { currentPlan } = usePlan(sessionId);

  const shouldShowPlan =
    currentPlan && currentPlan.hasGeneratedPlan && currentPlan.steps.length > 0;

  const renderPlanButton = () => {
    if (!shouldShowPlan) return null;

    const completedSteps = currentPlan.steps.filter((step) => step.done).length;
    const totalSteps = currentPlan.steps.length;
    const isComplete = currentPlan.isComplete;

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05, y: -2 }}
        onClick={() =>
          setActivePanelContent({
            type: 'plan',
            source: null,
            title: 'Task Plan',
            timestamp: Date.now(),
          })
        }
        className="h-10 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-700/90 rounded-full border border-gray-200/60 dark:border-gray-600/40 shadow-sm hover:shadow-md backdrop-blur-sm transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            {isComplete ? (
              <FiCpu size={12} className="text-green-600 dark:text-green-400" />
            ) : (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FiCpu size={12} className="text-accent-600 dark:text-accent-400" />
              </motion.div>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Plan</span>
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isComplete
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
            }`}
          >
            {completedSteps}/{totalSteps}
          </div>
        </div>
      </motion.button>
    );
  };

  if (!shouldShowPlan) {
    return null;
  }

  return (
    <div className={`mx-0 mb-3 flex justify-center ${className}`}>
      {renderPlanButton()}
    </div>
  );
};
