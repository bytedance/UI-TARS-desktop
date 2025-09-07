import React, { useState } from 'react';
import { 
  FiFile, 
  FiImage, 
  FiEye, 
  FiChevronDown, 
  FiChevronUp, 
  FiFolder,
  FiClock,
  FiDownload,
  FiExternalLink
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
 * WorkspaceFileManager - Elegant file management interface for workspace
 * 
 * Features:
 * - Modern card-based design with glass morphism
 * - Smooth animations and micro-interactions
 * - File type categorization and filtering
 * - Elegant empty state
 * - Advanced file actions and preview
 * - Responsive grid layout
 */
export const WorkspaceFileManager: React.FC<WorkspaceFileManagerProps> = ({
  files,
  sessionId,
}) => {
  const { setActivePanelContent } = useSession();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedFileType, setSelectedFileType] = useState<string>('all');

  // Note: Removed auto-show logic to prevent conflicts with back navigation

  if (files.length === 0) {
    return null;
  }

  // Categorize files by type
  const fileTypes = {
    all: files,
    file: files.filter(f => f.type === 'file'),
    image: files.filter(f => f.type === 'screenshot' || f.type === 'image'),
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

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
      case 'image':
        return <FiImage size={20} className="text-blue-500 dark:text-blue-400" />;
      default:
        return <FiFile size={20} className="text-purple-500 dark:text-purple-400" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'screenshot':
      case 'image':
        return 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200/60 dark:border-blue-700/40';
      default:
        return 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200/60 dark:border-purple-700/40';
    }
  };

  // Animation variants removed for performance

  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100/60 dark:border-gray-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center border border-blue-200/60 dark:border-blue-700/40">
            <FiFolder size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              Generated Files
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {files.length} {files.length === 1 ? 'file' : 'files'} created
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* File type filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg">
            {[
              { key: 'all', label: 'All', count: fileTypes.all.length },
              { key: 'file', label: 'Files', count: fileTypes.file.length },
              { key: 'image', label: 'Images', count: fileTypes.image.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setSelectedFileType(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  selectedFileType === key
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                } ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={count === 0}
              >
                {label} {count > 0 && `(${count})`}
              </button>
            ))}
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200"
          >
            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Files Grid */}
      {isExpanded && (
        <div className="overflow-hidden">
            <div className="p-6 pt-0">
              {displayFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FiFile size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No {selectedFileType === 'all' ? '' : selectedFileType} files found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {displayFiles.map((file, index) => (
                    <div
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className="group cursor-pointer bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-750 dark:to-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-4 transition-all duration-200 hover:border-gray-300/80 dark:hover:border-gray-600/80 shadow-sm hover:shadow-md backdrop-blur-sm relative overflow-hidden"
                    >
                      {/* File icon and type indicator */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getFileTypeColor(file.type)} flex items-center justify-center border shadow-sm`}>
                          {getFileIcon(file.type)}
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-gray-700/80 flex items-center justify-center shadow-sm border border-gray-200/60 dark:border-gray-600/60 backdrop-blur-sm hover:scale-110 transition-transform duration-200">
                            <FiEye size={14} className="text-gray-600 dark:text-gray-400" />
                          </div>
                          
                          <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-gray-700/80 flex items-center justify-center shadow-sm border border-gray-200/60 dark:border-gray-600/60 backdrop-blur-sm hover:scale-110 transition-transform duration-200">
                            <FiExternalLink size={14} className="text-gray-600 dark:text-gray-400" />
                          </div>
                        </div>
                      </div>

                      {/* File info */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                          {file.name}
                        </h4>
                        
                        {file.path && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono bg-gray-50 dark:bg-gray-700/60 px-2 py-1 rounded-md border border-gray-200/60 dark:border-gray-600/60">
                            {normalizeFilePath(file.path)}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <FiClock size={12} />
                          <span>{formatTimestamp(file.timestamp)}</span>
                          {file.size && (
                            <>
                              <span>•</span>
                              <span>{file.size}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Subtle gradient overlay for depth */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/20 dark:to-gray-900/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
};
