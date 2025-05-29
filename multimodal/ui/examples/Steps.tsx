import React, { useState, useEffect } from 'react';
import { Steps } from '../src';
import { FiMoon, FiSun, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';

const INITIAL_STEPS = [
  {
    id: 1,
    title: 'Initial Data Collection',
    description:
      'Gathering base information from public sources and analyzing available research papers...',
    status: 'in-progress' as const,
  },
  {
    id: 2,
    title: 'Deep Analysis',
    description:
      'Processing collected data using advanced ML models and cross-referencing with existing research...',
    status: 'pending' as const,
  },
  {
    id: 3,
    title: 'Multi-round Verification',
    description:
      'Cross-checking results with domain experts and validating findings through multiple iterations...',
    status: 'pending' as const,
  },
  {
    id: 4,
    title: 'Pattern Recognition',
    description:
      'Identifying key patterns and correlations in the verified data using statistical methods...',
    status: 'pending' as const,
  },
  {
    id: 5,
    title: 'Final Synthesis',
    description:
      'Synthesizing all findings into comprehensive conclusions and actionable insights...',
    status: 'pending' as const,
  },
];

const App = () => {
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [expanded, setExpanded] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isResearching, setIsResearching] = useState(true);

  // 自动研究流程控制
  useEffect(() => {
    if (!isResearching) return;

    const currentStep = steps.find((s) => s.status === 'in-progress');
    if (!currentStep) {
      // 如果没有进行中的步骤，检查是否全部完成
      const allCompleted = steps.every((s) => s.status === 'completed');
      if (allCompleted) {
        setIsResearching(false);
        return;
      }
      // 找到第一个待处理的步骤
      const firstPending = steps.find((s) => s.status === 'pending');
      if (firstPending) {
        setSteps((prev) =>
          prev.map((s) => (s.id === firstPending.id ? { ...s, status: 'in-progress' } : s)),
        );
      }
      return;
    }

    // 修改研究耗时（0.8-2.5秒随机）
    const timer = setTimeout(
      () => {
        setSteps((prev) => {
          const newSteps = prev.map((s) =>
            s.id === currentStep.id ? { ...s, status: 'completed' } : s,
          );

          // 查找下一个待处理步骤
          const nextStep = newSteps.find((s) => s.status === 'pending');
          if (nextStep) {
            return newSteps.map((s) =>
              s.id === nextStep.id ? { ...s, status: 'in-progress' } : s,
            );
          }
          return newSteps;
        });
      },
      800 + Math.random() * 1700,
    ); // 缩短时间范围

    return () => clearTimeout(timer);
  }, [steps, isResearching]);

  // 添加判断是否全部完成的逻辑
  const allCompleted = steps.every((s) => s.status === 'completed');

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}
    >
      <div className="max-w-3xl mx-auto p-8">
        <div
          className={`rounded-2xl shadow-xl p-6 transition-colors duration-300 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-900'
                }`}
              >
                {allCompleted ? (
                  <div className="text-white text-2xl">✓</div>
                ) : isResearching ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <FiLoader className="w-6 h-6 text-white" />
                  </motion.div>
                ) : (
                  <div className="text-white text-2xl">•</div>
                )}
              </div>
              <div>
                <h1
                  className={`text-2xl font-semibold transition-colors duration-300 ${
                    darkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}
                >
                  Deep Research Progress
                </h1>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {steps.filter((s) => s.status === 'completed').length} of {steps.length} steps
                  completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  darkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsResearching(!isResearching)}
                className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                  darkMode
                    ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isResearching ? 'Pause Research' : 'Resume Research'}
              </button>
            </div>
          </div>

          <Steps
            steps={steps}
            expanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
            onUpdateStatus={() => {}}
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
