import React, { useEffect, useCallback } from 'react';
import type { MessageRenderer, StepsMessage } from '../types';
import { Steps } from '../../Steps';
import { useCanvas } from '../../Canvas/CanvasContext';

export const StepsMessageRenderer: MessageRenderer<StepsMessage> = ({ message }) => {
  // Always call hooks at the top level
  const { setCanvasVisible, setActiveBlock } = useCanvas();

  // 处理步骤点击，显示相关的工件
  const handleStepClick = useCallback(
    (stepId: number) => {
      // 查找当前步骤是否有关联的工件
      const step = message.steps?.find((s) => s.id === stepId);
      if (step?.artifactId) {
        setActiveBlock(step.artifactId);
        setCanvasVisible(true);
      }
    },
    [message.steps, setActiveBlock, setCanvasVisible],
  );

  // 自动显示进行中步骤或最后完成步骤的 Artifact
  useEffect(() => {
    const steps = message.steps || [];
    if (steps.length === 0) {
      return;
    }

    // 查找当前正在进行中的步骤
    const inProgressStep = steps.find((step) => step.status === 'in-progress');

    // 如果找到进行中的步骤且有关联的 artifactId，则自动显示
    if (inProgressStep?.artifactId) {
      setActiveBlock(inProgressStep.artifactId);
      setCanvasVisible(true);
      return;
    }

    // 如果没有进行中的步骤，尝试找最后一个已完成的步骤
    const completedSteps = steps.filter((step) => step.status === 'completed');
    const lastCompletedStep = completedSteps[completedSteps.length - 1];

    if (lastCompletedStep?.artifactId) {
      setActiveBlock(lastCompletedStep.artifactId);
      setCanvasVisible(true);
    }
  }, [message.steps, setActiveBlock, setCanvasVisible]);

  // 简单的空操作函数，因为步骤更新由服务端控制
  const handleUpdateStatus = useCallback(
    (id: number, status: 'pending' | 'in-progress' | 'completed') => {
      console.log(`Step ${id} status updated to ${status} (controlled by server)`);
    },
    [],
  );

  // 确保消息中包含步骤数据
  if (!message.steps || message.steps.length === 0) {
    return (
      <div className={`message ${message.role}`}>
        <div className="content steps-message">
          <p>No steps information available</p>
        </div>
        <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    );
  }

  return (
    <div className={`message ${message.role}`}>
      <div className="content steps-message">
        <Steps
          steps={message.steps}
          onUpdateStatus={handleUpdateStatus}
          onStepClick={handleStepClick}
          darkMode={false} // 使用默认的亮色模式
        />

        {/* 如果消息有其他内容，也一并显示 */}
        {message.content && <div className="steps-text-content">{message.content}</div>}
      </div>
      <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};
