import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCheck, 
  FiClock, 
  FiTarget, 
  FiCheckCircle, 
  FiArrowRight, 
  FiLoader
} from 'react-icons/fi';
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
 * PlanViewerRenderer - Renders the plan and its steps in the workspace area
 *
 * Features:
 * - Displays plan steps with completion status
 * - Shows progress indicator with keyframe navigation
 * - Elegant, minimal design consistent with workspace aesthetics
 */
export const PlanViewerRenderer: React.FC<PlanViewerRendererProps> = ({
  plan,
  onKeyframeChange,
}) => {
  const { steps, isComplete, summary, keyframes, currentKeyframeIndex } = plan;

  // Calculate progress percentage
  const progressPercentage = isComplete
    ? 100
    : steps.length === 0
      ? 0
      : (steps.filter((step) => step.done).length / steps.length) * 100;
  
  const completedStepsCount = steps.filter(step => step.done).length;

  // If no plan, show empty state
  if (!plan.hasGeneratedPlan || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-900/90 flex items-center justify-center mb-6 border border-gray-200/30 dark:border-gray-700/40 shadow-sm"
        >
          <FiTarget size={36} className="text-gray-400 dark:text-gray-500" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl font-medium mb-3 text-gray-800 dark:text-gray-200"
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
          require a plan.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Title and Plan Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        {isComplete ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-50/80 to-green-100/30 dark:from-green-900/20 dark:to-green-800/10 flex items-center justify-center mr-4 text-green-500 dark:text-green-400 border border-green-100/50 dark:border-green-800/30 shadow-sm">
            <FiCheckCircle size={22} />
          </div>
        ) : (
          <motion.div
            animate={{ 
              boxShadow: ["0 0 0 rgba(99, 102, 241, 0.2)", "0 0 12px rgba(99, 102, 241, 0.4)", "0 0 0 rgba(99, 102, 241, 0.2)"],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-50/80 to-accent-100/30 dark:from-accent-900/20 dark:to-accent-800/10 flex items-center justify-center mr-4 text-accent-500 dark:text-accent-400 border border-accent-100/50 dark:border-accent-800/30"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <FiTarget size={22} />
            </motion.div>
          </motion.div>
        )}
        <div>
          <h2 className="text-2xl font-medium text-gray-800 dark:text-gray-100">
            Execution Plan
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isComplete
              ? 'All steps have been completed successfully.'
              : 'The agent is executing this plan to complete your task.'}
          </p>
        </div>
      </motion.div>

      {/* Progress indicator with keyframe navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FiLoader size={14} className={isComplete ? "" : "animate-spin-slow"} />
            <span>Progress</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <span className={isComplete ? "text-green-600 dark:text-green-400" : "text-accent-600 dark:text-accent-400"}>
                {completedStepsCount}/{steps.length}
              </span> 
              <span className="text-gray-500 dark:text-gray-400">steps</span>
            </span>
            
            {/* Show keyframe info if available */}
            {keyframes && keyframes.length > 1 && currentKeyframeIndex !== undefined && (
              <div className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200/50 dark:border-gray-700/40 text-gray-600 dark:text-gray-400 font-medium shadow-sm">
                Keyframe {currentKeyframeIndex + 1}/{keyframes.length}
              </div>
            )}
          </div>
        </div>
        
        {/* Interactive Progress Bar with keyframe navigation */}
        {keyframes && keyframes.length > 1 ? (
          <div 
            className="relative h-6 bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden shadow-inner cursor-pointer"
            onClick={(e) => {
              if (!onKeyframeChange || !keyframes) return;
              
              // Calculate position relative to container
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              const percentage = relX / rect.width;
              
              // Calculate keyframe index based on click position
              const targetIndex = Math.min(
                Math.floor(percentage * keyframes.length),
                keyframes.length - 1
              );
              onKeyframeChange(targetIndex);
            }}
          >
            {/* Progress fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className={`h-full ${
                isComplete
                  ? 'bg-gradient-to-r from-green-400 to-green-500/90 dark:from-green-500/90 dark:to-green-400/80'
                  : 'bg-gradient-to-r from-accent-400 to-accent-500/90 dark:from-accent-500 dark:to-accent-400/90'
              }`}
            />
            
            {/* Keyframe markers */}
            {keyframes.map((keyframe, index) => {
              const position = (index / (keyframes.length - 1)) * 100;
              const isActive = index === currentKeyframeIndex;
              const isPast = currentKeyframeIndex !== undefined && index <= currentKeyframeIndex;
              
              return (
                <div
                  key={index}
                  className="absolute top-0 bottom-0 z-10 flex items-center justify-center"
                  style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                >
                  <motion.div 
                    className={`w-3 h-3 rounded-full border-2 ${
                      isActive 
                        ? 'bg-white dark:bg-gray-900 border-accent-500 dark:border-accent-400 transform scale-125 shadow-sm' 
                        : isPast
                          ? 'bg-white dark:bg-gray-900 border-green-500 dark:border-green-400'
                          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-500'
                    }`}
                    whileHover={{ scale: 1.3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onKeyframeChange) onKeyframeChange(index);
                    }}
                    title={formatTimestamp(keyframe.timestamp)}
                  />
                  
                  {/* Active keyframe indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-accent-400 dark:bg-accent-500"
                      animate={{ 
                        scale: [1, 1.8], 
                        opacity: [0.4, 0]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    />
                  )}
                </div>
              );
            })}
            
            {/* Timestamp indicator for active keyframe */}
            {currentKeyframeIndex !== undefined && keyframes[currentKeyframeIndex] && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(keyframes[currentKeyframeIndex].timestamp)}
              </div>
            )}
          </div>
        ) : (
          // Simple progress bar without keyframe navigation
          <div className="h-2 bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className={`h-full ${
                isComplete
                  ? 'bg-gradient-to-r from-green-400 to-green-500/90 dark:from-green-500/90 dark:to-green-400/80'
                  : 'bg-gradient-to-r from-accent-400 to-accent-500/90 dark:from-accent-500 dark:to-accent-400/90'
              }`}
            />
          </div>
        )}
      </motion.div>

      {/* Steps list with elegant cards */}
      <div className="flex-1 overflow-auto pr-2 workspace-scrollbar">
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
                  <div 
                    className={`absolute left-6 w-0.5 top-12 bottom-0 
                      ${step.done && steps[index + 1].done 
                        ? 'bg-gradient-to-b from-green-400 to-green-300/50 dark:from-green-500/80 dark:to-green-400/30' 
                        : isActive && index + 1 === completedStepsCount
                          ? 'bg-gradient-to-b from-accent-400 to-accent-300/50 dark:from-accent-500/80 dark:to-accent-400/30'
                          : 'bg-gradient-to-b from-gray-300 to-gray-200/50 dark:from-gray-600/80 dark:to-gray-500/30'}`} 
                  />
                )}

                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm backdrop-blur-sm
                      ${step.done
                        ? 'bg-gradient-to-br from-green-400/90 to-green-500/90 dark:from-green-500/90 dark:to-green-400/80 text-white'
                        : isActive
                          ? 'bg-gradient-to-br from-accent-400/90 to-accent-500/90 dark:from-accent-500/90 dark:to-accent-400/80 text-white animate-pulse'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300/80 dark:from-gray-700/90 dark:to-gray-600/70 text-gray-500 dark:text-gray-400'
                      }`}
                  >
                    {step.done ? (
                      <FiCheck size={22} />
                    ) : isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        <FiLoader size={22} />
                      </motion.div>
                    ) : (
                      <FiClock size={20} />
                    )}
                  </div>

                  {/* Step content card */}
                  <div className="flex-1">
                    <motion.div
                      whileHover={{ y: -2, boxShadow: "0 8px 16px -6px rgba(0,0,0,0.05)" }}
                      transition={{ duration: 0.2 }}
                      className={`bg-white dark:bg-gray-800/90 rounded-xl p-4 border shadow-sm transition-all duration-200
                        ${step.done
                          ? 'border-l-4 border-green-500 dark:border-green-400 border-gray-100/80 dark:border-gray-700/60'
                          : isActive
                            ? 'border-l-4 border-accent-500 dark:border-accent-400 border-gray-100/80 dark:border-gray-700/60'
                            : 'border-gray-200/70 dark:border-gray-700/50 opacity-70'
                        }`}
                    >
                      <div
                        className={`text-sm leading-relaxed 
                          ${step.done
                            ? 'text-gray-800 dark:text-gray-200'
                            : isActive
                              ? 'text-gray-800 dark:text-gray-200'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                      >
                        {step.content}
                      </div>

                      {/* Step status indicator */}
                      <div className="flex justify-between items-center mt-3 text-xs">
                        <div
                          className={`flex items-center ${
                            step.done
                              ? 'text-green-600 dark:text-green-400'
                              : isActive
                                ? 'text-accent-600 dark:text-accent-400'
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
                              <FiLoader size={12} className="mr-1 animate-spin" />
                              <span>In progress</span>
                            </>
                          ) : (
                            <>
                              <FiClock size={12} className="mr-1" />
                              <span>Pending</span>
                            </>
                          )}
                        </div>
                        <div className="px-2 py-0.5 rounded-full text-[0.65rem] bg-gray-100/70 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
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
            className="mt-8 pt-6 border-t border-gray-200/60 dark:border-gray-700/30"
          >
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-50/80 to-green-100/30 dark:from-green-900/20 dark:to-green-800/10 flex items-center justify-center mr-3 text-green-500 dark:text-green-400 border border-green-100/50 dark:border-green-800/30">
                <FiCheck size={16} />
              </div>
              <div className="font-medium text-gray-800 dark:text-gray-200">Plan Summary</div>
            </div>
            <motion.div 
              initial={{ opacity: 0.5, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gradient-to-r from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800/80 p-5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-sm"
            >
              {summary}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
