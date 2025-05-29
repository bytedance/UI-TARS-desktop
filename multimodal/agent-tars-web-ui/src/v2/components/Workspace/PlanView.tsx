import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCpu, FiPlayCircle, FiPauseCircle } from 'react-icons/fi';
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
          currentKeyframeIndex
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
        <div className="text-gray-500 dark:text-gray-400">No plan available</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="mr-3 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-lg border border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/30"
            title="Back to workspace"
          >
            <FiArrowLeft size={16} />
          </motion.button>

          <div className="w-8 h-8 mr-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100/50 dark:border-gray-700/30 flex items-center justify-center text-gray-600 dark:text-gray-400">
            <FiCpu size={16} />
          </div>

          <div>
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
              Task Plan
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {displayedPlan.isComplete ? "Completed" : "In progress"}
            </div>
          </div>
        </div>

        {/* Future replay controls */}
        <div className="flex items-center space-x-2">
          {currentPlan.keyframes && currentPlan.keyframes.length > 1 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentKeyframeIndex !== undefined && (
                <span>Keyframe {currentKeyframeIndex + 1} of {currentPlan.keyframes.length}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan content */}
      <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/30">
        <PlanViewerRenderer 
          plan={{
            ...displayedPlan,
            keyframes: currentPlan.keyframes,
            currentKeyframeIndex
          }}
          onKeyframeChange={handleKeyframeChange}
        />
      </div>
    </motion.div>
  );
};
