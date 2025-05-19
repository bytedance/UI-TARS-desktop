import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import './steps.css';

interface Step {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  artifactId?: string; // 新增: 关联的工件ID
}

interface StepsProps {
  steps: Step[];
  onUpdateStatus: (id: number, status: Step['status']) => void;
  onStepClick?: (id: number) => void; // 新增: 步骤点击回调
  darkMode: boolean;
}

interface StepItemProps {
  step: Step;
  isLast: boolean;
  onUpdateStatus: (id: number, status: Step['status']) => void;
  onStepClick?: (id: number) => void; // 新增: 步骤点击回调
  custom: number;
  darkMode: boolean;
  isNew?: boolean;
}

export const Steps = memo<StepsProps>(({ steps, onUpdateStatus, onStepClick, darkMode }) => {
  const [expanded, setExpanded] = useState(true); // 默认展开
  const prevStepsLengthRef = useRef(steps.length);
  const stepsRef = useRef(steps);

  // Detect newly added steps
  useEffect(() => {
    stepsRef.current = steps.map((step, index) => {
      // Mark the step as new if steps count has increased
      const isNew =
        steps.length > prevStepsLengthRef.current && index >= prevStepsLengthRef.current;
      return { ...step, isNew };
    });
    prevStepsLengthRef.current = steps.length;
  }, [steps]);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="steps-container">
      <div className="steps-header">
        <h2 className={`steps-title ${darkMode ? 'dark' : 'light'}`}>
          Steps (
          {steps.filter((s) => s.status === 'completed' || s.status === 'in-progress').length}/
          {steps.length})
        </h2>
        <button
          onClick={toggleExpand}
          className={`steps-toggle-button ${darkMode ? 'dark' : 'light'}`}
          aria-label={expanded ? 'Hide all steps' : 'Show all steps'}
        >
          {expanded ? (
            <>
              Hide all <FiChevronUp className="steps-icon" />
            </>
          ) : (
            <>
              Show all <FiChevronDown className="steps-icon" />
            </>
          )}
        </button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {expanded && (
          <motion.div
            className="steps-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: 'auto',
              transition: {
                height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.3, ease: 'easeIn' },
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              transition: {
                height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2, ease: 'easeOut' },
              },
            }}
          >
            <AnimatePresence initial={false}>
              {steps.map((step, index) => (
                <StepItem
                  key={`step-${step.id}`}
                  step={step}
                  isLast={index === steps.length - 1}
                  onUpdateStatus={onUpdateStatus}
                  onStepClick={onStepClick}
                  custom={index}
                  darkMode={darkMode}
                  isNew={stepsRef.current[index]?.isNew}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const StepItem = memo<StepItemProps>(
  ({ step, isLast, onUpdateStatus, onStepClick, custom, darkMode, isNew }) => {
    const getStatusIcon = () => {
      switch (step.status) {
        case 'completed':
          return (
            <motion.div
              className="step-icon completed"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <FiCheckCircle />
            </motion.div>
          );
        case 'in-progress':
          return (
            <div className="step-icon in-progress">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <FiLoader />
              </motion.div>
            </div>
          );
        default:
          return (
            <div className="step-icon pending">
              <FiCircle />
            </div>
          );
      }
    };

    const handleStatusClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // 防止触发步骤点击事件
      // 处理状态更新
      const nextStatus = {
        pending: 'in-progress',
        'in-progress': 'completed',
        completed: 'pending',
      } as const;
      onUpdateStatus(step.id, nextStatus[step.status]);
    };

    // 触发点击回调
    const handleStepClick = () => {
      if (step.artifactId && onStepClick) {
        onStepClick(step.id);
      }
    };

    // Special animation for newly added steps
    const variants = {
      hidden: { opacity: 0, y: -10, height: 0 },
      visible: { opacity: 1, y: 0, height: 'auto' },
      exit: { opacity: 0, height: 0 },
    };

    const hasArtifact = !!step.artifactId;

    return (
      <motion.div
        variants={variants}
        initial={isNew ? 'hidden' : false}
        animate="visible"
        exit="exit"
        custom={custom}
        transition={{
          duration: 0.4,
          delay: isNew ? 0.2 : custom * 0.08,
        }}
        className={`step-item ${darkMode ? 'dark' : 'light'} ${isNew ? 'new-step' : ''} ${
          step.status === 'completed'
            ? 'completed'
            : step.status === 'in-progress'
              ? 'in-progress'
              : 'pending'
        } ${hasArtifact ? 'has-artifact' : ''}`}
        layout
        onClick={hasArtifact ? handleStepClick : undefined}
      >
        <div className="step-content">
          <button
            onClick={handleStatusClick}
            className="step-button"
            aria-label={`Toggle status for step: ${step.title}`}
          >
            {getStatusIcon()}
          </button>

          {!isLast && (
            <motion.div
              className={`step-connector ${step.status}`}
              initial={{ height: 0 }}
              animate={{
                height: '100%',
              }}
              transition={{
                height: { duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] },
              }}
            />
          )}

          <div className="step-details">
            <motion.h3
              className={`step-title ${step.status} ${hasArtifact ? 'with-artifact' : ''}`}
              initial={isNew ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {step.title}
              {hasArtifact && (
                <button
                  className="view-artifact-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStepClick();
                  }}
                  title="查看详情"
                >
                  查看详情
                </button>
              )}
            </motion.h3>
            <motion.p
              className="step-description"
              initial={isNew ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {step.description}
            </motion.p>
          </div>
        </div>
      </motion.div>
    );
  },
);
