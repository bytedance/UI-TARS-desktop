import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MessageRenderer } from '../types';
import type { ToolCallMessage } from '../../../types/chat';

export const ToolCallMessageRenderer: MessageRenderer<ToolCallMessage> = ({ message }) => {
  // 格式化参数显示
  const formatArguments = () => {
    if (!message.arguments) return 'No arguments';

    if (typeof message.arguments === 'string') {
      return message.arguments;
    }

    return JSON.stringify(message.arguments, null, 2);
  };

  return (
    <div className="message assistant-message tool-message">
      <div className="content">
        <div className="tool-header">
          <span className="tool-name">🛠️ {message.name}</span>
          <span className="tool-id">ID: {message.toolCallId.substring(0, 8)}</span>
        </div>

        <div className="tool-arguments">
          <div className="arguments-label">Arguments:</div>
          <SyntaxHighlighter
            language="json"
            // @ts-expect-error
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            {formatArguments()}
          </SyntaxHighlighter>
        </div>
      </div>
      <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};
