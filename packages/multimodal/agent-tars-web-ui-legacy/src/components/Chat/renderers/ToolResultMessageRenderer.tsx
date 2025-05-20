import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MessageRenderer } from '../types';
import type { ToolResultMessage } from '../../../types/chat';

export const ToolResultMessageRenderer: MessageRenderer<ToolResultMessage> = ({ message }) => {
  // 格式化内容显示
  const formatContent = () => {
    if (message.error) {
      return message.error;
    }

    if (!message.content) return 'No content';

    // 处理不同类型的内容
    if (typeof message.content === 'object') {
      return JSON.stringify(message.content, null, 2);
    }

    return message.content;
  };

  // 推断语言类型
  const inferLanguage = () => {
    if (message.error) return 'text';

    const content = formatContent();

    // 检测是否是JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      return 'json';
    }

    // 检测是否是HTML
    if (content.trim().startsWith('<') && content.includes('</')) {
      return 'html';
    }

    // 检测是否是代码
    if (
      content.includes('function') ||
      content.includes('const ') ||
      content.includes('import ') ||
      content.includes('class ')
    ) {
      return 'javascript';
    }

    return 'text';
  };

  return (
    <div
      className={`message assistant-message tool-result-message ${message.error ? 'error' : ''}`}
    >
      <div className="content">
        <div className="tool-header">
          <span className="tool-name">
            {message.error ? '❌' : '✅'} {message.name} Result
          </span>
          <span className="tool-id">ID: {message.toolCallId.substring(0, 8)}</span>
        </div>

        <div className="tool-content">
          <SyntaxHighlighter
            language={inferLanguage()}
            // @ts-expect-error
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: message.error ? 'rgba(255,80,80,0.1)' : undefined,
            }}
          >
            {formatContent()}
          </SyntaxHighlighter>
        </div>
      </div>
      <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};
