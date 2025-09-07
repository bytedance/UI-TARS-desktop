import React, { useState } from 'react';
import {
  FiFile,
  FiImage,
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCode,
  FiFileText,
} from 'react-icons/fi';
import { FileItem } from '@/common/state/atoms/files';
import { useSession } from '@/common/hooks/useSession';
import { formatTimestamp } from '@/common/utils/formatters';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';

interface WorkspaceFileManagerProps {
  files: FileItem[];
  sessionId: string;
}

/**
 * WorkspaceFileManager - Minimalist file management interface
 *
 * Features:
 * - Compact list-based design with subtle elegance
 * - Clean typography and refined spacing
 * - Smart file type indicators
 * - Efficient space utilization
 * - Professional aesthetic
 */
export const WorkspaceFileManager: React.FC<WorkspaceFileManagerProps> = ({ files, sessionId }) => {
  const { setActivePanelContent } = useSession();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedFileType, setSelectedFileType] = useState<string>('all');



  if (files.length === 0) {
    return null;
  }

  // Categorize files by type
  const fileTypes = {
    all: files,
    file: files.filter((f) => f.type === 'file'),
    image: files.filter((f) => f.type === 'screenshot' || f.type === 'image'),
  };

  const displayFiles = fileTypes[selectedFileType as keyof typeof fileTypes] || files;

  const handleFileClick = (file: FileItem) => {
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

  const getFileIcon = (type: string, fileName: string) => {
    if (type === 'screenshot' || type === 'image') {
      return <FiImage size={14} className="text-emerald-600 dark:text-emerald-400" />;
    }

    // Determine icon by file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
      case 'jsx':
      case 'js':
        return <FiCode size={14} className="text-blue-600 dark:text-blue-400" />;
      case 'md':
      case 'txt':
        return <FiFileText size={14} className="text-gray-600 dark:text-gray-400" />;
      default:
        return <FiFile size={14} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getFileTypeBadge = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            TSX
          </span>
        );
      case 'ts':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            TS
          </span>
        );
      case 'jsx':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded">
            JSX
          </span>
        );
      case 'js':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
            JS
          </span>
        );
      case 'md':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            MD
          </span>
        );
      case 'png':
      case 'jpg':
      case 'jpeg':
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
            IMG
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            {ext?.toUpperCase() || 'FILE'}
          </span>
        );
    }
  };



  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/30">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <FiFile size={12} className="text-gray-600 dark:text-gray-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Generated Files
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            ({files.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Compact Filter */}
          {fileTypes.image.length > 0 && (
            <button
              onClick={() => setSelectedFileType(selectedFileType === 'image' ? 'all' : 'image')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedFileType === 'image'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Images
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Compact File List */}
      {isExpanded && (
        <div className="max-h-80 overflow-y-auto">
          {displayFiles.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No {selectedFileType === 'all' ? '' : selectedFileType} files
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
              {displayFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors duration-150"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">{getFileIcon(file.type, file.name)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {file.name}
                      </span>
                      {getFileTypeBadge(file.name)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <FiClock size={10} />
                      <span>{formatTimestamp(file.timestamp)}</span>
                      {file.path && (
                        <>
                          <span>•</span>
                          <span
                            className="inline-block overflow-hidden whitespace-nowrap"
                            title={normalizeFilePath(file.path)}
                            style={{ textOverflow: 'ellipsis' }}
                          >
                            {normalizeFilePath(file.path)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* View Action */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <FiEye size={14} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
