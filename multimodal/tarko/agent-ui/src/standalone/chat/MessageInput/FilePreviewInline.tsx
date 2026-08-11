import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiFileText, FiX } from 'react-icons/fi';
import type { UploadedFileInfo } from '@/common/types';

interface FilePreviewInlineProps {
  files: UploadedFileInfo[];
  onRemoveFile: (index: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Displays non-image files that have already been persisted to the workspace. */
export const FilePreviewInline: React.FC<FilePreviewInlineProps> = ({ files, onRemoveFile }) => {
  if (files.length === 0) return null;

  return (
    <div className="px-5 pt-3 pb-2">
      <AnimatePresence>
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <motion.div
              key={file.relativePath}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="group flex max-w-64 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700/60"
              title={file.relativePath}
            >
              <FiFileText className="h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-300" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                  {file.name}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-100"
                title={`Remove ${file.name}`}
                aria-label={`Remove ${file.name}`}
              >
                <FiX size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};
