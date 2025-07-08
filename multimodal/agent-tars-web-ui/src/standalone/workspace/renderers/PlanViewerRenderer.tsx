// /multimodal/agent-tars-web-ui/src/standalone/workspace/renderers/PlanViewerRenderer.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiClock, FiTarget, FiCheckCircle } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { AgentEventStream } from '@/common/types';

interface PlanViewerRendererProps {
  plan: {
    steps: AgentEventStream.PlanStep[];
    isComplete: boolean;
    summary: string | null;
    hasGeneratedPlan: boolean;
    keyframes?: PlanKeyframe[];
    currentKeyframeIndex?: number;
  };
  onKeyframeChange?: (index: number) => void;
}

export interface PlanKeyframe {
  timestamp: number;
  steps: AgentEventStream.PlanStep[];
  isComplete: boolean;
  summary: string | null;
}

/**
 * PlanViewerRenderer - Simple black and white plan display
 */
export const PlanViewerRenderer: React.FC<PlanViewerRendererProps> = ({
  plan,
  onKeyframeChange,
}) => {
  const { steps, isComplete, summary, keyframes, currentKeyframeIndex } = plan;

  const completedStepsCount = steps.filter((step) => step.done).length;

  // If no plan, show empty state
  if (!plan.hasGeneratedPlan || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-700"
        >
          <FiTarget size={24} className="text-gray-400 dark:text-gray-500" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl font-medium mb-3 text-gray-800 dark:text-gray-200"
        >
          No Plan Generated
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-gray-600 dark:text-gray-400 max-w-md"
        >
          The agent hasn't created a plan for this task yet, or the task was simple enough to not
          require planning.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Steps list with simple styling */}
      <div className="flex-1 overflow-auto">
        <motion.div
          className="space-y-4"
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          initial="hidden"
          animate="visible"
        >
          {steps.map((step, index) => {
            const isActive = index === completedStepsCount && !isComplete;
            return (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                className="relative"
              >
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-4 w-px top-10 bottom-0 bg-gray-200 dark:bg-gray-700" />
                )}

                <div className="flex items-start gap-3">
                  {/* Simple status indicator */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      step.done
                        ? 'bg-gray-800 dark:bg-gray-200 border-gray-800 dark:border-gray-200 text-white dark:text-gray-800'
                        : isActive
                          ? 'bg-white dark:bg-gray-900 border-gray-800 dark:border-gray-200 text-gray-800 dark:text-gray-200'
                          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step.done ? (
                      <FiCheck size={14} />
                    ) : isActive ? (
                      <span className="text-xs font-bold">{index + 1}</span>
                    ) : (
                      <FiClock size={14} />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1">
                    <motion.div
                      whileHover={{ y: -1 }}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${
                        step.done
                          ? 'border-gray-800 dark:border-gray-200'
                          : isActive
                            ? 'border-gray-800 dark:border-gray-200'
                            : 'border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <div
                        className={`text-sm leading-relaxed ${
                          step.done
                            ? 'text-gray-800 dark:text-gray-200'
                            : isActive
                              ? 'text-gray-800 dark:text-gray-200'
                              : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step.content}
                      </div>

                      {/* Step status */}
                      <div className="flex justify-between items-center mt-3 text-xs">
                        <div
                          className={`flex items-center ${
                            step.done
                              ? 'text-gray-800 dark:text-gray-200'
                              : isActive
                                ? 'text-gray-800 dark:text-gray-200'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {step.done ? (
                            <>
                              <FiCheckCircle size={12} className="mr-1" />
                              <span>Completed</span>
                            </>
                          ) : isActive ? (
                            <>
                              <FiClock size={12} className="mr-1" />
                              <span>In progress</span>
                            </>
                          ) : (
                            <>
                              <FiClock size={12} className="mr-1" />
                              <span>Pending</span>
                            </>
                          )}
                        </div>
                        <div className="px-2 py-0.5 rounded text-[0.65rem] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                          Step {index + 1}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Plan Summary (shown only when complete) */}
      <AnimatePresence>
        {isComplete && summary && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-full bg-gray-800 dark:bg-gray-200 flex items-center justify-center mr-3 text-white dark:text-gray-800">
                <FiCheck size={12} />
              </div>
              <div className="font-medium text-gray-800 dark:text-gray-200">Plan Summary</div>
            </div>
            <motion.div
              initial={{ opacity: 0.5, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {summary}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
