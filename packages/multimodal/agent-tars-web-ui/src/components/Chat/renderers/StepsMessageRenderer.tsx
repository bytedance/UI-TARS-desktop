import React from 'react';
import type { MessageRenderer, StepsMessage } from '../types';
import { Steps } from '../../Steps';

export const StepsMessageRenderer: MessageRenderer<StepsMessage> = ({ message }) => {
  // 确保消息中包含步骤数据
  if (!message.steps || message.steps.length === 0) {
    console.warn('Received StepsMessage without steps data');
    return null;
  }

  // 简单的空操作函数，因为步骤更新由服务端控制
  const handleUpdateStatus = (id: number, status: 'pending' | 'in-progress' | 'completed') => {
    // 这里故意空着，因为步骤更新由服务端控制
    console.log(`Step ${id} status updated to ${status} (controlled by server)`);
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="content steps-message">
        <Steps
          steps={message.steps}
          onUpdateStatus={handleUpdateStatus}
          darkMode={false} // 使用默认的亮色模式
        />

        {/* 如果消息有其他内容，也一并显示 */}
        {message.content && <div className="steps-text-content">{message.content}</div>}
      </div>
      <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};
