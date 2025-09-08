import React from 'react';
import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { wrapMarkdown } from '@/common/utils/markdown';
import { DisplayMode } from '../types';

interface MessageContentProps {
  message: string;
  isMarkdown?: boolean;
  displayMode?: DisplayMode;
  isShortMessage?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isMarkdown = false,
  displayMode = 'source',
  isShortMessage = false,
}) => {
  if (isShortMessage) {
    return (
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
        }}
        className="text-center bg-gradient-to-r from-gray-700 to-gray-900 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent"
        style={{
          fontSize: '30px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          WebkitBackgroundClip: 'text',
          padding: '3rem',
          borderRadius: '8px',
        }}
      >
        {message}
      </motion.div>
    );
  }

  if (isMarkdown && displayMode === 'source') {
    return (
      <div className="max-w-full overflow-auto">
        <MarkdownRenderer content={wrapMarkdown(message)} />
      </div>
    );
  }

  // For very long content, provide scrollable container
  if (message.length > 5000) {
    return (
      <div className="max-h-96 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono antialiased">
          {message}
        </pre>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-auto">
      <MarkdownRenderer className="prose dark:prose-invert prose-sm max-w-none" content={message} />
    </div>
  );
};
