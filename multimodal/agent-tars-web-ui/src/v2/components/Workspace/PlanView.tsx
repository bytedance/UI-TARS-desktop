import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCpu, FiPlayCircle, FiPauseCircle, FiCheckCircle, FiClock, FiMap } from 'react-icons/fi';
import { useSession } from '../../hooks/useSession';
import { usePlan } from '../../hooks/usePlan';
import { PlanViewerRenderer, PlanKeyframe } from './renderers/PlanViewerRenderer';

interface PlanViewProps {
  onBack: () => void;
}

/**
 * PlanView Component - Displays plan details in the workspace
 *
 * Features:
 * - Shows current plan status and steps
 * - Supports timeline navigation through plan keyframes
 * - Will support replay functionality in future
 */
export const PlanView: React.FC<PlanViewProps> = ({ onBack }) => {
  const { activeSessionId } = useSession();
  const { currentPlan } = usePlan(activeSessionId);
  const [currentKeyframeIndex, setCurrentKeyframeIndex] = useState<number | undefined>(undefined);
  const [displayedPlan, setDisplayedPlan] = useState(currentPlan);

  // Set the initial keyframe to the latest when plan changes
  useEffect(() => {
    if (currentPlan?.keyframes?.length) {
      setCurrentKeyframeIndex(currentPlan.keyframes.length - 1);
    }
    setDisplayedPlan(currentPlan);
  }, [currentPlan]);

  // Update displayed plan when keyframe changes
  useEffect(() => {
    if (currentPlan?.keyframes && currentKeyframeIndex !== undefined) {
      const keyframe = currentPlan.keyframes[currentKeyframeIndex];
      if (keyframe) {
        setDisplayedPlan({
          ...currentPlan,
          steps: keyframe.steps,
          isComplete: keyframe.isComplete,
          summary: keyframe.summary,
          currentKeyframeIndex,
        });
      }
    }
  }, [currentPlan, currentKeyframeIndex]);

  // Handle keyframe change
  const handleKeyframeChange = (index: number) => {
    setCurrentKeyframeIndex(index);
  };

  if (!activeSessionId || !currentPlan || !displayedPlan) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border border-gray-200/50 dark:border-gray-700/30 shadow-sm">
            <FiMap className="text-gray-500 dark:text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200">
            No Plan Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            The agent hasn't created a plan for this task yet, or the task was simple enough to not require planning.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50/80 dark:bg-gray-900/20"
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 rounded-lg border border-transparent hover:border-gray-100/70 dark:hover:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50"
            title="Back to workspace"
          >
            <FiArrowLeft size={18} />
          </motion.button>

          <div className="w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 border border-accent-100/50 dark:border-accent-800/30 flex items-center justify-center text-accent-600 dark:text-accent-400">
            <FiCpu size={18} />
          </div>

          <div>
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
              Task Plan
            </h2>
            <div className="text-xs flex items-center text-gray-500 dark:text-gray-400">
              {displayedPlan.isComplete ? (
                <span className="flex items-center">
                  <FiCheckCircle className="mr-1 text-green-500 dark:text-green-400" size={12} />
                  Completed
                </span>
              ) : (
                <span className="flex items-center">
                  <FiClock className="mr-1 text-accent-500 dark:text-accent-400" size={12} />
                  In progress
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Future replay controls */}
        <div className="flex items-center space-x-2">
          {currentPlan.keyframes && currentPlan.keyframes.length > 1 && (
            <div className="text-xs bg-gray-100/70 dark:bg-gray-800/70 px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/30">
              {currentKeyframeIndex !== undefined && (
                <span>
                  Keyframe {currentKeyframeIndex + 1} of {currentPlan.keyframes.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan content */}
      <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50/80 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-900/30">
        <PlanViewerRenderer
          plan={{
            ...displayedPlan,
            keyframes: currentPlan.keyframes,
            currentKeyframeIndex,
          }}
          onKeyframeChange={handleKeyframeChange}
        />
      </div>
    </motion.div>
  );
};
