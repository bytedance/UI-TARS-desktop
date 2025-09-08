import React, { useState, useMemo } from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FiFile, FiAlertCircle } from 'react-icons/fi';
import { CodeEditor } from '@/sdk/code-editor';
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

/**
 * Format file size in bytes
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  const language = getLanguage(extension);

  return (
    <div className="space-y-4">
      {/* Compact Tab Bar */}
      <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 border-b border-gray-200 dark:border-gray-700">
        {files.map((file, index) => {
          const { fileName: tabFileName } = getFileTypeInfo(file.path);
          const isActive = index === activeTab;
          
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`
                flex-shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${isActive 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {activeFile.error}
            </p>
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
            maxHeight="calc(100vh - 300px)"
          />
        )}
      </div>
    </div>
  );
};
