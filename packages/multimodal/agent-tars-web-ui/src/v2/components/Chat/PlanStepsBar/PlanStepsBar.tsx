import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiClock, FiLoader, FiChevronDown, FiChevronUp, FiList } from 'react-icons/fi';
import { PlanStep } from '@multimodal/agent-interface';
import './PlanStepsBar.css';

interface PlanStepsBarProps {
  steps: PlanStep[];
  isVisible: boolean;
  onToggleVisibility: () => void;
  isPlanComplete?: boolean;
  summary?: string;
}

/**
 * PlanStepsBar Component - Displays the agent's current plan steps as an elegant progress bar
 * 
 * Design principles:
 * - Minimalist aesthetic with subtle animations and transitions
 * - Monochromatic color palette with accent highlights only on active elements
 * - Progressive disclosure of information with expandable/collapsible details
 * - Visual clarity showing plan progress through both icons and subtle styling
 */
export const PlanStepsBar: React.FC<PlanStepsBarProps> = ({
  steps,
  isVisible,
  onToggleVisibility,
  isPlanComplete = false,
  summary,
}) => {
  // Show full progress bar when complete
  const progressPercentage = isPlanComplete 
    ? 100 
    : steps.length === 0 
      ? 0 
      : (steps.filter(step => step.done).length / steps.length) * 100;
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -20, height: 0 },
    visible: { 
      opacity: 1, 
      y: 0, 
      height: 'auto',
      transition: { 
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1]
      }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      height: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="plan-steps-container">
      {/* Toggle button */}
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onToggleVisibility}
        className="flex items-center px-3 py-1.5 mb-3 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-[#E5E6EC] dark:border-gray-700/30 hover:bg-white dark:hover:bg-gray-800/90 transition-all duration-200"
      >
        {isVisible ? (
          <>
            <FiChevronUp className="mr-1.5 text-gray-500 dark:text-gray-400" size={14} />
            Hide Plan
          </>
        ) : (
          <>
            <FiList className="mr-1.5 text-gray-500 dark:text-gray-400" size={14} />
            Show Plan
            {steps.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {steps.filter(step => step.done).length}/{steps.length}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Steps progress bar */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="plan-steps"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="plan-steps-content rounded-xl bg-white/95 dark:bg-gray-800/95 border border-[#E5E6EC] dark:border-gray-700/30 overflow-hidden mb-4"
          >
            {steps.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No plan needed for this simple task.
              </div>
            ) : (
              <>
                {/* Progress indicator */}
                <div className="px-4 pt-3 pb-2 border-b border-gray-100/50 dark:border-gray-700/30">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Task Progress
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {steps.filter(step => step.done).length}/{steps.length} steps
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gray-700/80 dark:bg-gray-400/80"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                </div>

                {/* Steps list */}
                <div className="px-4 py-3">
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                          step.done 
                            ? 'bg-gray-700/90 dark:bg-gray-500/90 text-white' 
                            : 'bg-gray-100 dark:bg-gray-700/70 text-gray-400 dark:text-gray-500 border border-gray-200/50 dark:border-gray-600/30'
                        }`}>
                          {step.done ? (
                            <FiCheck size={12} />
                          ) : (
                            <FiClock size={10} />
                          )}
                        </div>
                        <div className={`flex-1 text-sm ${
                          step.done 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {step.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary when plan is complete */}
                  {isPlanComplete && summary && (
                    <div className="mt-4 pt-3 border-t border-gray-100/50 dark:border-gray-700/30">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Summary
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50/70 dark:bg-gray-700/30 p-2 rounded-lg">
                        {summary}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
