import React from 'react';
import type { MessageRenderer, StepsMessage } from '../types';
import { Steps } from '../../Steps';

export const StepsMessageRenderer: MessageRenderer<StepsMessage> = ({
  message,
  isExpanded = true,
  toggleExpand,
}) => {
  return (
    <div className={`message ${message.role}`}>
      <div className="content steps-message">
        <Steps
          steps={message.steps}
          expanded={isExpanded}
          onToggleExpand={() => toggleExpand?.(message.id)}
          onUpdateStatus={() => {}} // 步骤更新由服务端控制
          darkMode={false} // 使用默认的亮色模式
        />

        {/* 如果消息有其他内容，也一并显示 */}
        {message.content && <div className="steps-text-content">{message.content}</div>}
      </div>
      <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};
