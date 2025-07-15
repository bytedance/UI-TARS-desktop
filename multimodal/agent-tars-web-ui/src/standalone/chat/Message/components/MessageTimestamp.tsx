import { ChatCompletionContentPart } from '@multimodal/agent-interface';
import React from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface MessageTimestampProps {
  timestamp: number;
  content: string | ChatCompletionContentPart[];
  role: string;
  inlineStyle?: boolean; // 新增属性，用于内联显示模式
}

/**
 * Component for displaying message timestamp and copy functionality
 *
 * Design principles:
 * - Unobtrusive placement to reduce visual noise
 * - Accessible on hover for contextual actions
 * - Clear visual feedback for copy operations
 */
export const MessageTimestamp: React.FC<MessageTimestampProps> = ({
  timestamp,
  content,
  role,
  inlineStyle = false,
}) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = () => {
    const textToCopy =
      typeof content === 'string'
        ? content
        : content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');

    copyToClipboard(textToCopy);
  };

  if (inlineStyle) {
    // 内联样式模式，只显示复制按钮
    return (
      <button
        onClick={handleCopy}
        className="flex items-center text-gray-400 hover:text-accent-500 dark:hover:text-accent-400 transition-colors"
        title="Copy message"
      >
        {isCopied ? <FiCheck size={12} /> : <FiCopy size={12} />}
        <span className="ml-1">{isCopied ? 'Copied' : 'Copy'}</span>
      </button>
    );
  }

  // 原有的浮动样式
  return (
    <div
      className={`absolute bottom-0 ${role === 'user' ? 'right-0' : 'left-0'} flex items-center text-xs text-gray-400 dark:text-gray-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 -mb-6`}
    >
      <span className="mr-2">{formatTimestamp(timestamp)}</span>
      <button
        onClick={handleCopy}
        className="flex items-center text-gray-400 hover:text-accent-500 dark:hover:text-accent-400"
        title="Copy to clipboard"
      >
        {isCopied ? <FiCheck size={12} /> : <FiCopy size={12} />}
      </button>
    </div>
  );
};
