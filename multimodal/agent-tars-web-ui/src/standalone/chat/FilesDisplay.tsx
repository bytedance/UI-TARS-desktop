import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFile, FiImage, FiDownload, FiClock, FiEye } from 'react-icons/fi';
import { useAtomValue } from 'jotai';
import { sessionFilesAtom } from '@/common/state/atoms/files';
import { useSession } from '@/common/hooks/useSession';
import { formatTimestamp } from '@/common/utils/formatters';

interface FilesDisplayProps {
  sessionId: string;
}

/**
 * FilesDisplay - 展示会话中产生的所有文件
 */
export const FilesDisplay: React.FC<FilesDisplayProps> = ({ sessionId }) => {
  const allFiles = useAtomValue(sessionFilesAtom);
  const { setActivePanelContent } = useSession();

  const files = allFiles[sessionId] || [];

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
      // 为文件类型设置更详细的信息，确保 FileResultRenderer 能正确处理
      setActivePanelContent({
        type: 'file',
        source: file.content || '',
        title: file.name,
        timestamp: file.timestamp,
        arguments: {
          path: file.path || file.name,
          content: file.content || '',
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
        return <FiImage size={16} className="text-purple-500 dark:text-purple-400" />;
      default:
        return <FiFile size={16} className="text-blue-500 dark:text-blue-400" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100/40 dark:border-gray-700/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100/40 dark:border-gray-700/20">
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center">
            <FiFile size={14} className="mr-2" />
            Generated Files ({files.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-100/40 dark:divide-gray-700/20">
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                onClick={() => handleFileClick(file)}
                className="flex items-center justify-between p-3 cursor-pointer group"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                      {file.name}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <FiClock size={10} className="mr-1" />
                      {formatTimestamp(file.timestamp)}
                      {file.path && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="truncate">{file.path}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleFileClick(file)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                    title="Preview"
                  >
                    <FiEye size={14} />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleDownload(file, e)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                    title="Download"
                  >
                    <FiDownload size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
