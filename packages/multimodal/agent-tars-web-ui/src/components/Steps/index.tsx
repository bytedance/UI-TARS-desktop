import React, { useState, useEffect } from 'react';
import { Steps } from '@multimodal/ui';
import { FiMinimize2, FiMaximize2, FiX, FiActivity } from 'react-icons/fi';
import './Steps.css';
import { AgentStep } from '../../types/chat';

interface AgentStepsProps {
  steps: AgentStep[];
  visible: boolean;
  onClose: () => void;
}

export function AgentStepsContainer({ steps, visible, onClose }: AgentStepsProps): JSX.Element {
  // 始终保持展开状态，除非明确最小化
  const [minimized, setMinimized] = useState(false);
  // 步骤展开状态，默认为true (展开)
  const [stepsExpanded, setStepsExpanded] = useState(true);

  // 计算已完成的步骤数
  const completedSteps = steps.filter((step) => step.status === 'completed').length;

  // 使用缓存的 steps ID 避免不必要的重渲染
  const stepsKey = steps.map(s => `${s.id}-${s.status}`).join('|');

  // 提供一个步骤展开切换函数
  const handleToggleExpand = () => {
    setStepsExpanded(!stepsExpanded);
  };

  // 不需要实际更新步骤状态，因为它由 mock 服务控制
  const handleUpdateStatus = () => {};

  // 组件可见性变化时重置最小化状态
  useEffect(() => {
    if (visible) {
      setMinimized(false);
    }
  }, [visible]);

  return (
    <div
      className={`agent-steps-container ${visible ? 'visible' : ''} ${
        minimized ? 'minimized' : ''
      }`}
    >
      <div className="agent-steps-header">
        <h3>
          <FiActivity />
          Agent 执行进度
        </h3>
        <div className="controls">
          <button onClick={() => setMinimized(!minimized)} aria-label={minimized ? "展开" : "最小化"}>
            {minimized ? <FiMaximize2 /> : <FiMinimize2 />}
          </button>
          <button onClick={onClose} aria-label="关闭">
            <FiX />
          </button>
        </div>
      </div>
      {!minimized && (
        <div className="agent-steps-content">
          <p className="task-summary">
            {completedSteps === steps.length
              ? '所有步骤已完成'
              : `正在执行：${completedSteps} / ${steps.length} 步骤`}
          </p>
          <Steps
            key={stepsKey}
            steps={steps}
            expanded={stepsExpanded}
            onToggleExpand={handleToggleExpand}
            onUpdateStatus={handleUpdateStatus}
            darkMode={false}
          />
        </div>
      )}
    </div>
  );
}
