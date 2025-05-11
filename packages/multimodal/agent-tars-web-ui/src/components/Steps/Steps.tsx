import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { StepItem } from './StepItem';
import type { StepsProps } from './types';
import './Steps.css';

/**
 * Steps component displays a sequence of steps with their current status
 * and allows expanding/collapsing the view.
 *
 * Features:
 * - Responsive design with support for light/dark mode
 * - Animated transitions for expand/collapse
 * - Visual indicators for step status (pending, in-progress, completed)
 */
export const Steps = memo<StepsProps>(
  ({ steps, expanded, onToggleExpand, onUpdateStatus, darkMode }) => {
    // Calculate completion stats
    const completedCount = steps.filter((s) => s.status === 'completed').length;
    const inProgressCount = steps.filter((s) => s.status === 'in-progress').length;
    const activeCount = completedCount + inProgressCount;

    return (
      <div className={`steps-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="steps-header">
          <h2 className={`steps-title ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Steps ({activeCount}/{steps.length})
          </h2>
          <button
            onClick={onToggleExpand}
            className={`steps-toggle-button ${
              darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
            }`}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide all steps' : 'Show all steps'}
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
              className="steps-content"
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
              <div className="steps-list">
                {steps.map((step, index) => (
                  <StepItem
                    key={`step-${step.id}`}
                    step={step}
                    isLast={index === steps.length - 1}
                    onUpdateStatus={onUpdateStatus}
                    custom={index}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
