/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';

interface Step {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface StepsProps {
  steps: Step[];
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateStatus: (id: number, status: Step['status']) => void;
  darkMode: boolean;
}

export const Steps = memo<StepsProps>(
  ({ steps, expanded, onToggleExpand, onUpdateStatus, darkMode }) => {
    // 保留所有步骤，而不是过滤
    const visibleSteps = steps;

    return (
      <div className="relative">
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-xl font-medium transition-colors duration-300 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            Steps (
            {steps.filter((s) => s.status === 'completed' || s.status === 'in-progress').length}/
            {steps.length})
          </h2>
          <button
            onClick={onToggleExpand}
            className={`flex items-center gap-2 transition-colors duration-300 ${
              darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {expanded ? (
              <>
                Hide all <FiChevronUp className="w-5 h-5" />
              </>
            ) : (
              <>
                Show all <FiChevronDown className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {expanded && (
            <motion.div
              className="space-y-4 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                transition: {
                  height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                  opacity: { duration: 0.2, ease: 'easeIn' },
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                transition: {
                  height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                  opacity: { duration: 0.2, ease: 'easeOut' },
                },
              }}
            >
              {visibleSteps.map((step, index) => (
                <StepItem
                  key={`step-${step.id}`}
                  step={step}
                  isLast={index === visibleSteps.length - 1}
                  onUpdateStatus={onUpdateStatus}
                  custom={index}
                  darkMode={darkMode}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

const StepItem = memo<StepItemProps>(({ step, isLast, onUpdateStatus, custom, darkMode }) => {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <FiCheckCircle className={`w-6 h-6 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`} />
        );
      case 'in-progress':
        return (
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <FiLoader className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </motion.div>
          </div>
        );
      default:
        return <FiCircle className={`w-6 h-6 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />;
    }
  };

  const handleClick = () => {
    const nextStatus = {
      pending: 'in-progress',
      'in-progress': 'completed',
      completed: 'pending',
    } as const;
    onUpdateStatus(step.id, nextStatus[step.status]);
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
      }}
      initial="hidden"
      animate="visible"
      custom={custom}
      transition={{
        duration: 0.2,
        delay: custom * 0.05, // 缩短动画延迟
      }}
      className="relative"
      layout // 添加 layout 属性优化位置变化的动画
    >
      <div className="flex items-start gap-4">
        <button onClick={handleClick} className="relative focus:outline-none">
          {getStatusIcon()}
          {!isLast && (
            <motion.div
              className="absolute left-3 top-6 w-0.5 h-full -translate-x-1/2"
              initial={{ height: 0 }}
              animate={{
                height: '100%',
                backgroundColor: darkMode
                  ? step.status === 'completed'
                    ? '#e5e7eb'
                    : step.status === 'in-progress'
                      ? '#9ca3af'
                      : '#374151'
                  : step.status === 'completed'
                    ? '#111827'
                    : step.status === 'in-progress'
                      ? '#4b5563'
                      : '#e5e7eb',
              }}
              transition={{
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                backgroundColor: { duration: 0.2 },
              }}
            />
          )}
        </button>
        <div className="flex-1">
          <h3
            className={`text-lg font-medium mb-1 transition-colors duration-300 ${
              darkMode
                ? step.status === 'completed'
                  ? 'text-gray-100'
                  : step.status === 'in-progress'
                    ? 'text-gray-300'
                    : 'text-gray-500'
                : step.status === 'completed'
                  ? 'text-gray-900'
                  : step.status === 'in-progress'
                    ? 'text-gray-700'
                    : 'text-gray-500'
            }`}
          >
            {step.title}
          </h3>
          <p
            className={`leading-relaxed transition-colors duration-300 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {step.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
});
