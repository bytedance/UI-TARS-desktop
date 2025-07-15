import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFile,
  FiImage,
  FiClock,
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiFolder,
} from 'react-icons/fi';
import { useAtomValue } from 'jotai';
import { sessionFilesAtom } from '@/common/state/atoms/files';
import { useSession } from '@/common/hooks/useSession';
import { formatTimestamp } from '@/common/utils/formatters';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';

interface FilesDisplayProps {
  sessionId: string;
  compact?: boolean;
}

/**
 * FilesDisplay - Enhanced file display component with elegant design
 *
 * Features:
 * - Tool Call inspired styling for consistency
 * - Compact single-line file entries
 * - Height-limited container with scroll
 * - Always visible when files exist
 * - No download buttons for cleaner UI
 * - Privacy-protected path display
 */
export const FilesDisplay: React.FC<FilesDisplayProps> = ({ sessionId, compact = false }) => {
  const allFiles = useAtomValue(sessionFilesAtom);
  const { setActivePanelContent } = useSession();
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded

  const files = allFiles[sessionId] || [];

  // Auto-set workspace panel to show the latest file
  useEffect(() => {
    if (files.length > 0) {
      const lastFile = files[files.length - 1];
      setActivePanelContent({
        type: 'file',
        source: lastFile.content || '',
        title: lastFile.name,
        timestamp: lastFile.timestamp,
        arguments: {
          path: lastFile.path,
          content: lastFile.content,
        },
      });
    }
  }, [files.length, setActivePanelContent]);

  if (files.length === 0) {
    return null;
  }

  const handleFileClick = (file: (typeof files)[0]) => {
    if (file.type === 'screenshot' || file.type === 'image') {
      setActivePanelContent({
        type: 'image',
        source: file.content || '',
        title: file.name,
        timestamp: file.timestamp,
      });
    } else {
      setActivePanelContent({
        type: 'file',
        source: file.content || '',
        title: file.name,
        timestamp: file.timestamp,
        arguments: {
          path: file.path,
          content: file.content,
        },
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
      case 'image':
        return <FiImage size={16} className="text-blue-500 dark:text-blue-400" />;
      default:
        return <FiFile size={16} className="text-purple-500 dark:text-purple-400" />;
    }
  };

  return (
    <div className={compact ? 'max-w-full' : 'mb-4'}>
      {/* Header with file count and toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <FiFolder size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Generated Files
          </span>
          <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
            {files.length}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20 rounded-md transition-colors"
        >
          <div>
            <FiChevronDown size={12} />
          </div>
        </button>
      </div>

      {/* Files list */}
      {isExpanded && (
        <div className="overflow-hidden">
          {/* Scrollable container with height limit */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <button
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl active:scale-[0.99] border text-left group w-full bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200"
              >
                {/* File icon */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {getFileIcon(file.type)}
                </div>

                {/* File info - improved layout with proper truncation */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  {/* File name - no truncation, takes necessary space */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap flex-shrink-0">
                      {file.name}
                    </span>
                    {/* Timestamp */}
                    <span className="font-[400] text-xs opacity-70 text-slate-600 dark:text-slate-400 flex-shrink-0">
                      {formatTimestamp(file.timestamp)}
                    </span>
                  </div>

                  {/* File path - truncated with CSS and normalized for privacy */}
                  {file.path && (
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-[400] text-xs opacity-60 text-slate-500 dark:text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1">
                        {normalizeFilePath(file.path)}
                      </span>
                    </div>
                  )}
                </div>

                {/* View indicator */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <FiEye
                    className="opacity-60 group-hover:opacity-100 transition-all duration-200 text-slate-500 dark:text-slate-400"
                    size={14}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
