import React from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { formatTimestamp } from '../../../../utils/formatters';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface MessageTimestampProps {
  timestamp: number;
  content: string | any[];
  role: string;
}

/**
 * Component for displaying message timestamp and copy functionality
 *
 * Design principles:
 * - Unobtrusive placement to reduce visual noise
 * - Accessible on hover for contextual actions
 * - Clear visual feedback for copy operations
 */
export const MessageTimestamp: React.FC<MessageTimestampProps> = ({ timestamp, content, role }) => {
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
