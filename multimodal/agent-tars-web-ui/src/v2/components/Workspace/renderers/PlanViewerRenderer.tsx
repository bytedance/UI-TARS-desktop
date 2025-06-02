import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiClock, FiLoader, FiTarget } from 'react-icons/fi';
import type { PlanStep } from '@multimodal/agent-interface';
import { formatTimestamp } from '../../../utils/formatters';

interface PlanViewerRendererProps {
  plan: {
    steps: PlanStep[];
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
  steps: PlanStep[];
  isComplete: boolean;
  summary: string | null;
}

/**
 * PlanViewerRenderer - Renders the plan and its steps in the workspace area
 *
 * Features:
 * - Displays plan steps with completion status
 * - Shows progress indicator
 * - Supports keyframe navigation for plan history
 * - Elegant, minimal design consistent with workspace aesthetics
 */
export const PlanViewerRenderer: React.FC<PlanViewerRendererProps> = ({
  plan,
  onKeyframeChange,
}) => {
  const { steps, isComplete, summary, keyframes, currentKeyframeIndex } = plan;

  // 计算进度百分比
  const progressPercentage = isComplete
    ? 100
    : steps.length === 0
      ? 0
      : (steps.filter((step) => step.done).length / steps.length) * 100;

  // 如果没有计划，显示空状态
  if (!plan.hasGeneratedPlan || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
          <FiTarget size={32} />
        </div>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          No plan generated
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          The agent hasn't created a plan for this task yet, or the task was simple enough to not
          require a plan.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* 标题和计划摘要 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
          {isComplete ? (
            <FiTarget className="mr-3 text-green-500 dark:text-green-400" size={20} />
          ) : (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <FiTarget className="mr-3 text-accent-500 dark:text-accent-400" size={20} />
            </motion.div>
          )}
          Agent Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {isComplete
            ? 'The plan has been completed successfully.'
            : 'The agent is currently executing this plan to complete your task.'}
        </p>
      </div>

      {/* 关键帧时间轴 (如果有关键帧) */}
      {/* {keyframes && keyframes.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan Timeline
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentKeyframeIndex !== undefined &&
                keyframes[currentKeyframeIndex] &&
                formatTimestamp(keyframes[currentKeyframeIndex].timestamp)}
            </div>
          </div>
          <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex">
              {keyframes.map((keyframe, index) => (
                <div
                  key={index}
                  className={`flex-1 cursor-pointer transition-all duration-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 ${
                    index === currentKeyframeIndex ? 'bg-gray-200/80 dark:bg-gray-700/80' : ''
                  }`}
                  onClick={() => onKeyframeChange && onKeyframeChange(index)}
                >
                  <div className="h-full flex items-center justify-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        index === currentKeyframeIndex
                          ? 'bg-accent-500 dark:bg-accent-400 w-3 h-3'
                          : 'bg-gray-400 dark:bg-gray-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )} */}

      {/* 进度指示器 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {steps.filter((step) => step.done).length}/{steps.length} steps
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="h-full bg-accent-500 dark:bg-accent-400"
          />
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 w-0.5 top-10 bottom-0 bg-gray-100 dark:bg-gray-700" />
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 ${
                    step.done
                      ? 'bg-green-500 dark:bg-green-400 shadow-sm'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  {step.done ? (
                    <FiCheck size={18} />
                  ) : index === steps.filter((s) => s.done).length ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <FiLoader size={18} />
                    </motion.div>
                  ) : (
                    <FiClock size={16} />
                  )}
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div
                    className={`text-sm ${
                      step.done
                        ? 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 计划总结 - 在底部显示 */}
      {isComplete && summary && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">Plan Summary</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
};
