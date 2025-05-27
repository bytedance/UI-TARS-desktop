import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiClock, FiLoader, FiChevronDown, FiChevronUp, FiList, FiCheck, FiCpu, FiTarget } from 'react-icons/fi';
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
  // 计算进度百分比
  const progressPercentage = isPlanComplete 
    ? 100 
    : steps.length === 0 
      ? 0 
      : (steps.filter(step => step.done).length / steps.length) * 100;
  
  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0, y: -20, height: 0 },
    visible: { 
      opacity: 1, 
      y: 0, 
      height: 'auto',
      transition: { 
        duration: 0.3,
        ease: [0.23, 1, 0.32, 1],
        staggerChildren: 0.08
      }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      height: 0,
      transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="plan-steps-container">
      {/* 切换按钮 - 增强版 */}
      <motion.button
        whileHover={{ y: -2, boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.05)" }}
        whileTap={{ scale: 0.97 }}
        onClick={onToggleVisibility}
        className="plan-toggle-button flex items-center px-3 py-1.5 mb-3 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-[#E5E6EC] dark:border-gray-700/30 hover:bg-white dark:hover:bg-gray-800/90 transition-all duration-200"
      >
        {isVisible ? (
          <>
            <FiChevronUp className="mr-1.5 text-gray-500 dark:text-gray-400" size={14} />
            Hide Plan
          </>
        ) : (
          <>
            <FiCpu className="mr-1.5 text-gray-500 dark:text-gray-400" size={14} />
            <span className="mr-1">Plan</span>
            {steps.length > 0 && (
              <span className="flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {steps.filter(step => step.done).length}/{steps.length}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* 计划步骤内容区 */}
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
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mb-3"
                >
                  <FiTarget className="text-gray-400 dark:text-gray-500" size={24} />
                </motion.div>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  No plan needed for this simple task.
                </motion.p>
              </div>
            ) : (
              <>
                {/* 进度指示器 - 增强版 */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-100/50 dark:border-gray-700/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                      <FiTarget className="mr-2 text-gray-500 dark:text-gray-400" size={14} />
                      Task Progress
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <span className={isPlanComplete ? "text-gray-700 dark:text-gray-300 font-medium" : ""}>
                        {steps.filter(step => step.done).length}/{steps.length}
                      </span>
                      <span className="ml-1">steps</span>
                      {isPlanComplete && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-2 flex items-center text-gray-700 dark:text-gray-300"
                        >
                          <FiCheck size={12} className="mr-1 complete-icon" />
                          <span className="text-xs font-medium">Complete</span>
                        </motion.span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-gray-600/90 to-gray-700/90 dark:from-gray-300/90 dark:to-gray-400/90 progress-bar-fill"
                      style={{ '--progress-width': `${progressPercentage}%` } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* 步骤列表 - 增强版 */}
                <div className="px-5 py-4">
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <motion.div 
                        key={index}
                        variants={stepVariants}
                        className="relative plan-step"
                        style={{ '--step-index': index } as React.CSSProperties}
                      >
                        {/* 连接线 */}
                        {index < steps.length - 1 && <div className="step-connector" />}
                        
                        {/* 步骤内容 */}
                        <div className="flex items-start gap-4 relative z-10">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 step-indicator ${step.done ? 'completed' : ''} ${
                            step.done 
                              ? 'bg-gradient-to-br from-gray-700/90 to-gray-800/90 dark:from-gray-500/90 dark:to-gray-600/90 text-white shadow-sm' 
                              : 'bg-gray-100/90 dark:bg-gray-700/70 text-gray-400 dark:text-gray-500 border border-gray-200/50 dark:border-gray-600/30'
                          }`}>
                            {step.done ? (
                              <FiCheck size={16} />
                            ) : index === steps.filter(s => s.done).length ? (
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <FiLoader size={16} />
                              </motion.div>
                            ) : (
                              <FiClock size={14} />
                            )}
                          </div>
                          <div className={`flex-1 pt-1.5 ${
                            step.done 
                              ? 'text-gray-800 dark:text-gray-200' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            <div className={`${
                              step.done ? 'font-medium' : ''
                            }`}>
                              {step.content}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* 总结部分 - 增强版 */}
                  {isPlanComplete && summary && (
                    <motion.div 
                      className="mt-5 pt-4 border-t border-gray-100/50 dark:border-gray-700/30 plan-summary"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FiCheck className="mr-2 text-gray-600 dark:text-gray-400" size={14} />
                        Plan Summary
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50/80 dark:bg-gray-700/40 p-3 rounded-lg border border-gray-100/50 dark:border-gray-700/30">
                        {summary}
                      </div>
                    </motion.div>
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
