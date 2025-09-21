import React, { useState, useMemo } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FiFile, FiAlertCircle } from 'react-icons/fi';
import { CodeEditor } from '@tarko/ui';
import { getFileTypeInfo } from '../utils/fileTypeUtils';
import { formatBytes } from '../utils/codeUtils';

interface FileContent {
  path: string;
  content: string;
  error?: string;
}

interface TabbedFilesRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
}

/**
 * Parse read_multiple_files tool result content
 * Files are separated by '---' delimiter with file paths
 */
const parseReadMultipleFilesContent = (content: any): FileContent[] => {
  if (!content || !Array.isArray(content)) {
    return [];
  }

  const files: FileContent[] = [];

  content.forEach((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      item.type !== 'text' ||
      typeof item.text !== 'string'
    ) {
      return;
    }

    const text = item.text;
    const lines = text.split('\n');

    let currentFile: FileContent | null = null;
    let contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line is a file separator with valid path format
      // Must be: "---" followed by a line that looks like a file path ending with ":"
      if (line.trim() === '---' && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const pathMatch = nextLine.match(/^(.+?):\s*$/);

        if (pathMatch) {
          // Save previous file if exists
          if (currentFile) {
            currentFile.content = contentLines.join('\n');
            files.push(currentFile);
          }

          // Start new file
          currentFile = {
            path: pathMatch[1].trim(),
            content: '',
          };
          contentLines = [];
          i++; // Skip the path line
          continue;
        }
      }

      // Check if this is the first line and looks like a file path
      if (i === 0 && !currentFile) {
        // Check for error format: "path: Error - message"
        const errorMatch = line.match(/^(.+?):\s*Error\s*-\s*(.+)$/);
        if (errorMatch) {
          files.push({
            path: errorMatch[1].trim(),
            content: '',
            error: errorMatch[2].trim(),
          });
          continue;
        }

        // Check for normal file format: "path:"
        const pathMatch = line.match(/^(.+?):\s*$/);
        if (pathMatch) {
          currentFile = {
            path: pathMatch[1].trim(),
            content: '',
          };
          continue;
        }
      }

      // Add line to current file content
      if (currentFile) {
        contentLines.push(line);
      } else {
        // If no current file, create a default one
        if (!currentFile) {
          currentFile = {
            path: `file_${files.length + 1}`,
            content: '',
          };
        }
        contentLines.push(line);
      }
    }

    // Save the last file
    if (currentFile) {
      currentFile.content = contentLines.join('\n');
      files.push(currentFile);
    }
  });

  return files;
};

export const TabbedFilesRenderer: React.FC<TabbedFilesRendererProps> = ({
  panelContent,
  onAction,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const files = useMemo(() => {
    return parseReadMultipleFilesContent(panelContent.source);
  }, [panelContent.source]);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <FiFile className="mx-auto mb-2" size={24} />
          <p>No files to display</p>
        </div>
      </div>
    );
  }

  const activeFile = files[activeTab];

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <FiAlertCircle className="mx-auto mb-2" size={24} />
          <p>Invalid file data</p>
        </div>
      </div>
    );
  }
  const { fileName } = getFileTypeInfo(activeFile.path);

  return (
    <div className="space-y-2">
      {/* Modern Tab Bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {files
          .map((file, index) => {
            if (!file || !file.path) {
              return null;
            }

            const { fileName: tabFileName } = getFileTypeInfo(file.path);
            const isActive = index === activeTab;

            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap border
                ${
                  isActive
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200/70 dark:border-gray-700/40 shadow-sm'
                    : 'bg-gray-50/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              >
                <div className="flex items-center space-x-1.5">
                  {file.error ? (
                    <FiAlertCircle className="text-red-500" size={12} />
                  ) : (
                    <FiFile size={12} />
                  )}
                  <span title={file.path}>{tabFileName}</span>
                </div>
              </button>
            );
          })
          .filter(Boolean)}
      </div>

      {/* File Content with CodeEditor */}
      <div className="overflow-hidden">
        {activeFile.error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <FiAlertCircle size={16} />
              <span className="font-medium">Error reading file</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{activeFile.error}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500 font-mono">
              {activeFile.path}
            </p>
          </div>
        ) : (
          <CodeEditor
            code={activeFile.content}
            fileName={fileName}
            filePath={activeFile.path}
            fileSize={formatBytes(activeFile.content.length)}
            showLineNumbers={true}
            maxHeight={'80vh'}
          />
        )}
      </div>
    </div>
  );
};
