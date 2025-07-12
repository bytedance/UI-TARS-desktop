import React, { useEffect } from 'react';
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
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (data) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [data, onClose]);

  if (!data) return null;

  const isHtmlFile = data.fileName.toLowerCase().endsWith('.html') || data.fileName.toLowerCase().endsWith('.htm');
  const isMarkdownFile = data.fileName.toLowerCase().endsWith('.md') || data.fileName.toLowerCase().endsWith('.markdown');

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
              title="Exit fullscreen (ESC)"
            >
              <FiX size={20} />
            </motion.button>
            <div>
              <h2 className="font-medium text-gray-800 dark:text-gray-200">{data.fileName}</h2>
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.filePath}</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Press ESC to exit
          </div>
        </div>

        {/* Content */}
        <div className="h-full overflow-auto pb-16">
          {isHtmlFile && data.displayMode === 'rendered' ? (
            <div className="h-full">
              <iframe
                srcDoc={data.content}
                className="w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto prose dark:prose-invert prose-lg p-12">
              {data.isMarkdown && data.displayMode === 'rendered' ? (
                <MessageContent
                  message={data.content}
                  isMarkdown={true}
                  displayMode={data.displayMode}
                  isShortMessage={false}
                />
              ) : isMarkdownFile && data.displayMode === 'rendered' ? (
                <MarkdownRenderer content={data.content} />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
                  {data.content}
                </pre>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
