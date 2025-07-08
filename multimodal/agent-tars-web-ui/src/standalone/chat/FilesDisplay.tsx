import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFile,
  FiImage,
  FiDownload,
  FiClock,
  FiEye,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { useAtomValue } from 'jotai';
import { sessionFilesAtom } from '@/common/state/atoms/files';
import { useSession } from '@/common/hooks/useSession';
import { formatTimestamp } from '@/common/utils/formatters';

interface FilesDisplayProps {
  sessionId: string;
  compact?: boolean; // 新增：是否为紧凑模式（badge 形式）
}

/**
 * FilesDisplay - 展示会话中产生的所有文件
 * 支持展开/折叠模式，优化 UI 设计
 */
export const FilesDisplay: React.FC<FilesDisplayProps> = ({ sessionId, compact = false }) => {
  const allFiles = useAtomValue(sessionFilesAtom);
  const { setActivePanelContent } = useSession();
  const [isExpanded, setIsExpanded] = useState(!compact);

  const files = allFiles[sessionId] || [];

  // 当有新文件时，自动设置 workspace panel 显示最后一个文件
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

  const handleDownload = (file: (typeof files)[0], event: React.MouseEvent) => {
    event.stopPropagation();

    if (!file.content) return;

    const blob = new Blob([file.content], {
      type: file.type === 'screenshot' || file.type === 'image' ? 'image/png' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={compact ? '' : 'mb-4'}
    >
      {/* Compact badge 模式 - 始终显示 */}
      {compact && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-700/90 rounded-full border border-gray-200/60 dark:border-gray-600/40 shadow-sm hover:shadow-md backdrop-blur-sm transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <FiFile size={12} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Generated Files
            </span>
            <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
              {files.length}
            </div>
          </div>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <FiChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
          </motion.div>
        </motion.button>
      )}

      {/* 展开的文件列表 - 根据模式和展开状态显示 */}
      <AnimatePresence>
        {(!compact || isExpanded) && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: compact ? 10 : 0 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: compact ? 10 : 0 }}
            transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            className={`overflow-hidden ${compact ? 'mt-3' : ''}`}
          >
            <div className="bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800/90 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm backdrop-blur-sm">
              {/* Header with improved styling - 只在非 compact 模式下显示 */}
              {!compact && (
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50/80 to-gray-100/60 dark:from-gray-800/80 dark:to-gray-700/60 border-b border-gray-200/50 dark:border-gray-700/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100/50 dark:border-blue-800/30">
                        <FiFile size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Generated Files
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {files.length} file{files.length !== 1 ? 's' : ''} created
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Files list with enhanced design */}
              <div className="divide-y divide-gray-100/50 dark:divide-gray-700/30">
                <AnimatePresence>
                  {files.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.03)' }}
                      onClick={() => handleFileClick(file)}
                      className="flex items-center justify-between p-4 cursor-pointer group transition-all duration-200"
                    >
                      <div className="flex items-center flex-1 min-w-0 gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center border border-gray-200/50 dark:border-gray-600/30 shadow-sm group-hover:shadow-md transition-shadow">
                          {getFileIcon(file.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {file.name}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-3">
                            <div className="flex items-center gap-1">
                              <FiClock size={10} />
                              {formatTimestamp(file.timestamp)}
                            </div>
                            {file.path && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[200px]" title={file.path}>
                                  {file.path}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileClick(file);
                          }}
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Preview"
                        >
                          <FiEye size={16} />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDownload(file, e)}
                          className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Download"
                        >
                          <FiDownload size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
