import React, { useState, useMemo } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FiFile, FiAlertCircle } from 'react-icons/fi';
import { CodeEditor } from '@/sdk/code-editor';
import { getFileTypeInfo } from '../utils/fileTypeUtils';
import { getLanguageFromExtension, formatBytes } from '../utils/codeUtils';

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

    // Split by '---' delimiter to get file sections
    const sections = text.split(/\n---\s*\n/);

    sections.forEach((section, index) => {
      if (!section.trim()) return;

      const lines = section.split('\n');

      // First line should contain the file path
      if (lines.length === 0) return;

      const firstLine = lines[0].trim();

      // Check for error format: "path: Error - message"
      const errorMatch = firstLine.match(/^(.+?):\s*Error\s*-\s*(.+)$/);
      if (errorMatch) {
        files.push({
          path: errorMatch[1].trim(),
          content: '',
          error: errorMatch[2].trim(),
        });
        return;
      }

      // Check for normal file format: "path:"
      const filePathMatch = firstLine.match(/^(.+?):\s*$/);
      if (filePathMatch) {
        const path = filePathMatch[1].trim();
        const content = lines.slice(1).join('\n');

        files.push({
          path,
          content,
        });
      } else {
        // If no path match, treat the whole section as content with index as path
        files.push({
          path: `file_${index + 1}`,
          content: section,
        });
      }
    });
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
  const { fileName, extension } = getFileTypeInfo(activeFile.path);
  const language = getLanguageFromExtension(extension);

  return (
    <div className="space-y-2">
      {/* Modern Tab Bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {files.map((file, index) => {
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
                <span className="truncate max-w-24">{tabFileName}</span>
              </div>
            </button>
          );
        })}
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
            language={language}
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
