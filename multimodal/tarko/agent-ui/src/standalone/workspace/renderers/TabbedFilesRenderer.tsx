import React, { useState, useMemo } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FiFile, FiAlertCircle } from 'react-icons/fi';
import { CodeBlock } from '../components/CodeBlock';
import { getFileTypeInfo } from '../utils/fileTypeUtils';

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
 */
const parseReadMultipleFilesContent = (content: any): FileContent[] => {
  if (!content || !Array.isArray(content)) {
    return [];
  }

  const files: FileContent[] = [];
  
  content.forEach(item => {
    if (!item || typeof item !== 'object' || item.type !== 'text' || typeof item.text !== 'string') {
      return;
    }

    const text = item.text;
    const lines = text.split('\n');
    
    // Parse each file from the text
    let currentFile: FileContent | null = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
      // Check if this line starts a new file (format: "path:")
      const filePathMatch = line.match(/^([^:]+):\s*$/);
      if (filePathMatch) {
        // Save previous file if exists
        if (currentFile) {
          currentFile.content = currentContent.join('\n');
          files.push(currentFile);
        }
        
        // Start new file
        currentFile = {
          path: filePathMatch[1].trim(),
          content: '',
        };
        currentContent = [];
      } else if (line.includes('Error -')) {
        // Handle error case
        const errorMatch = line.match(/^([^:]+):\s*Error\s*-\s*(.+)$/);
        if (errorMatch && !currentFile) {
          files.push({
            path: errorMatch[1].trim(),
            content: '',
            error: errorMatch[2].trim(),
          });
        }
      } else if (currentFile) {
        // Add content line
        currentContent.push(line);
      }
    }
    
    // Save last file
    if (currentFile) {
      currentFile.content = currentContent.join('\n');
      files.push(currentFile);
    }
  });
  
  return files;
};

/**
 * Get language for syntax highlighting based on file extension
 * Simplified version similar to FileResultRenderer
 */
const getLanguage = (extension: string): string => {
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    xml: 'xml',
    sh: 'bash',
    bash: 'bash',
  };

  return langMap[extension] || 'text';
};

export const TabbedFilesRenderer: React.FC<TabbedFilesRendererProps> = ({
  panelContent,
  onAction,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const files = useMemo(() => {
    return parseReadMultipleFilesContent(panelContent.content);
  }, [panelContent.content]);

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
  const language = getLanguage(extension);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Tab Bar */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {files.map((file, index) => {
            const { fileName: tabFileName } = getFileTypeInfo(file.path);
            const isActive = index === activeTab;
            
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                  flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${isActive 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  {file.error ? (
                    <FiAlertCircle className="text-red-500" size={14} />
                  ) : (
                    <FiFile size={14} />
                  )}
                  <span className="truncate max-w-32">{tabFileName}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-48">
                  {file.path}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* File Header */}
        <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {activeFile.error ? (
                <FiAlertCircle className="text-red-500" size={16} />
              ) : (
                <FiFile className="text-gray-500 dark:text-gray-400" size={16} />
              )}
              <span className="font-medium text-gray-900 dark:text-gray-100">{fileName}</span>
              {extension && (
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {extension.toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {activeFile.path}
            </div>
          </div>
        </div>

        {/* File Content Area */}
        <div className="flex-1 overflow-auto">
          {activeFile.error ? (
            <div className="p-4">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <FiAlertCircle size={16} />
                <span className="font-medium">Error reading file</span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {activeFile.error}
              </p>
            </div>
          ) : (
            <div className="h-full">
              <CodeBlock
                code={activeFile.content}
                language={language}
                showLineNumbers
                className="h-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
