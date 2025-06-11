import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiClock, FiLoader, FiTarget, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6 border border-gray-200/50 dark:border-gray-700/30 shadow-sm"
        >
          <FiTarget size={40} className="text-gray-400 dark:text-gray-500" />
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
    <div className="p-8 h-full flex flex-col">
      {/* 标题和计划摘要 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
          {isComplete ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 flex items-center justify-center mr-4 text-green-500 dark:text-green-400 border border-green-100/80 dark:border-green-800/30">
              <FiCheckCircle size={20} />
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 flex items-center justify-center mr-4 text-accent-500 dark:text-accent-400 border border-accent-100/50 dark:border-accent-800/30"
            >
              <FiTarget size={20} />
            </motion.div>
          )}
          Execution Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400 ml-14">
          {isComplete
            ? 'All steps have been completed successfully.'
            : 'The agent is executing this plan to complete your task.'}
        </p>
      </motion.div>

      {/* 关键帧时间轴 (如果有关键帧) */}
      {keyframes && keyframes.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Plan Timeline
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100/70 dark:bg-gray-800/70 px-3 py-1.5 rounded-full border border-gray-200/50 dark:border-gray-700/30">
              {currentKeyframeIndex !== undefined &&
                keyframes[currentKeyframeIndex] &&
                formatTimestamp(keyframes[currentKeyframeIndex].timestamp)}
            </div>
          </div>
          
          {/* 新的线性时间轴设计 */}
          <div className="relative h-12 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/70 dark:border-gray-700/40 shadow-sm">
            {/* 背景线 */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-y-1/2"></div>
            
            {/* 关键帧点 */}
            <div className="absolute inset-0 flex items-center px-4">
              {keyframes.map((keyframe, index) => {
                // 计算位置百分比 (0% 到 100%)
                const position = keyframes.length <= 1 ? 50 : (index / (keyframes.length - 1)) * 100;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="absolute cursor-pointer"
                    style={{ left: `${position}%` }}
                    onClick={() => onKeyframeChange && onKeyframeChange(index)}
                  >
                    <div className="flex flex-col items-center">
                      <div 
                        className={`w-4 h-4 rounded-full mb-1.5 transition-all duration-200 
                          ${index === currentKeyframeIndex 
                            ? 'bg-accent-500 dark:bg-accent-400 ring-4 ring-accent-200 dark:ring-accent-700/30 ring-opacity-60' 
                            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                          }`}
                      >
                        {/* 当前选中的点内部显示一个小点 */}
                        {index === currentKeyframeIndex && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                        )}
                      </div>
                      <div className="text-[0.65rem] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(keyframe.timestamp, true)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {/* 进度连接线 - 只连接到当前选中的点 */}
              {currentKeyframeIndex !== undefined && currentKeyframeIndex > 0 && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentKeyframeIndex / (keyframes.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute top-1/2 left-4 h-1 bg-accent-500 dark:bg-accent-400 transform -translate-y-1/2 rounded-full"
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 进度指示器 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {steps.filter((step) => step.done).length}/{steps.length} steps
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`h-full ${
              isComplete
                ? 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-400'
                : 'bg-gradient-to-r from-accent-400 to-accent-500 dark:from-accent-500 dark:to-accent-400'
            }`}
          />
        </div>
      </motion.div>

      {/* 步骤列表 */}
      <div className="flex-1 overflow-auto pr-2 workspace-scrollbar">
        <motion.div
          className="space-y-4"
          variants={{
            visible: { transition: { staggerChildren: 0.07 } },
          }}
          initial="hidden"
          animate="visible"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] },
                },
              }}
              className="relative"
            >
              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 w-0.5 top-12 bottom-0 bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600" />
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                    step.done
                      ? 'bg-gradient-to-br from-green-400 to-green-500 dark:from-green-500 dark:to-green-400 text-white'
                      : index === steps.filter((s) => s.done).length
                        ? 'bg-gradient-to-br from-accent-400 to-accent-500 dark:from-accent-500 dark:to-accent-400 text-white'
                        : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.done ? (
                    <FiCheck size={22} />
                  ) : index === steps.filter((s) => s.done).length ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    >
                      <FiLoader size={22} />
                    </motion.div>
                  ) : (
                    <FiClock size={20} />
                  )}
                </div>

                <div className="flex-1">
                  <div
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/70 dark:border-gray-700/40 shadow-sm ${
                      step.done
                        ? 'border-l-4 border-l-green-500 dark:border-l-green-400'
                        : index === steps.filter((s) => s.done).length
                          ? 'border-l-4 border-l-accent-500 dark:border-l-accent-400 animate-pulse'
                          : ''
                    }`}
                  >
                    <div
                      className={`text-sm leading-relaxed ${
                        step.done
                          ? 'text-gray-800 dark:text-gray-200'
                          : index === steps.filter((s) => s.done).length
                            ? 'text-gray-800 dark:text-gray-200'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.content}
                    </div>

                    {/* 步骤状态指示器 */}
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <div
                        className={`flex items-center ${
                          step.done
                            ? 'text-green-600 dark:text-green-400'
                            : index === steps.filter((s) => s.done).length
                              ? 'text-accent-600 dark:text-accent-400'
                              : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step.done ? (
                          <>
                            <FiCheckCircle size={12} className="mr-1" />
                            <span>Completed</span>
                          </>
                        ) : index === steps.filter((s) => s.done).length ? (
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
                      <div className="text-gray-400 dark:text-gray-500">Step {index + 1}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* 计划总结 - 在底部显示 */}
      {isComplete && summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8 pt-6 border-t border-gray-200/70 dark:border-gray-700/40"
        >
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 flex items-center justify-center mr-3 text-green-500 dark:text-green-400 border border-green-100/80 dark:border-green-800/30">
              <FiCheck size={16} />
            </div>
            <div className="font-medium text-gray-800 dark:text-gray-200">Plan Summary</div>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200/70 dark:border-gray-700/40 shadow-sm">
            {summary}
          </div>
        </motion.div>
      )}
    </div>
  );
};