import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { ChatCompletionContentPart } from '@multimodal/agent-interface';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface CopyButtonProps {
  content: string | ChatCompletionContentPart[];
  className?: string;
}

/**
 * CopyButton Component - 为消息提供直观的复制功能
 *
 * 设计原则：
 * - 悬浮显示，不干扰主要内容
 * - 提供清晰的交互反馈
 * - 适应不同消息类型的内容提取
 */
export const CopyButton: React.FC<CopyButtonProps> = ({ content, className = '' }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止点击事件冒泡到父元素

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
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleCopy}
      className={`flex items-center justify-center p-2 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:text-accent-500 dark:hover:text-accent-400 shadow-sm border border-gray-200/50 dark:border-gray-700/30 backdrop-blur-sm ${className}`}
      title="Copy to clipboard"
      aria-label="Copy message content"
    >
      {isCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
    </motion.button>
  );
};
