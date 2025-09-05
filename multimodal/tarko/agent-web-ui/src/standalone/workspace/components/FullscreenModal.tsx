import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { MessageContent } from '../renderers/generic/components/MessageContent';
import { FullscreenFileData } from '../types/panelContent';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
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

  const isHtmlFile =
    data.fileName.toLowerCase().endsWith('.html') || data.fileName.toLowerCase().endsWith('.htm');
  const isMarkdownFile =
    data.fileName.toLowerCase().endsWith('.md') ||
    data.fileName.toLowerCase().endsWith('.markdown');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex flex-col"
      >
        {/* Header - Compact One Line Layout */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200/60 dark:border-gray-700/60 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center min-w-0 flex-1">
            {/* Close button - refined and compact */}
            <motion.button
              whileHover={{ scale: 1.02, x: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="mr-3 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-md transition-all duration-150"
              title="Exit fullscreen (ESC)"
            >
              <FiX size={16} />
            </motion.button>

            {/* File info - single line with elegant typography */}
            <div className="min-w-0 flex-1 flex items-baseline gap-2">
              <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
                {data.fileName}
              </h2>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-mono overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                {normalizeFilePath(data.filePath)}
              </div>
            </div>
          </div>

          {/* ESC hint - subtle and elegant */}
          <div className="ml-4 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded border border-gray-200/50 dark:border-gray-700/50">
            <kbd className="text-xs">ESC</kbd> to exit
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isHtmlFile && data.displayMode === 'rendered' ? (
            <div className="h-full bg-white">
              <iframe
                srcDoc={data.content}
                className="w-full h-full border-0"
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin"
                style={{ backgroundColor: 'white' }}
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
