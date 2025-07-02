import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { MessageContent } from '../renderers/generic/components/MessageContent';
import { FullscreenFileData } from '../types/panelContent';

interface FullscreenModalProps {
  data: FullscreenFileData | null;
  onClose: () => void;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Exit fullscreen"
            >
              <FiX size={20} />
            </motion.button>
            <div>
              <h2 className="font-medium text-gray-800 dark:text-gray-200">{data.fileName}</h2>
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.filePath}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto prose dark:prose-invert prose-lg overflow-scroll p-6 h-full pb-[100px]">
          {data.isMarkdown ? (
            <MessageContent
              message={data.content}
              isMarkdown={true}
              displayMode={data.displayMode}
              isShortMessage={false}
            />
          ) : (
            <MarkdownRenderer content={data.content} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
