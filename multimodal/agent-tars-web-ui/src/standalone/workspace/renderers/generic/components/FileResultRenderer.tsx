import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDisplayMode, ToolResultContentPart } from '../../../types';
import { MessageContent } from './MessageContent';
import { DisplayMode } from '../types';
import { CodeEditor } from '@/sdk/code-editor';

// Constants
const MAX_HEIGHT_CALC = 'calc(100vh - 215px)';

interface FileResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
  displayMode?: FileDisplayMode;
}

export const FileResultRenderer: React.FC<FileResultRendererProps> = ({
  part,
  onAction,
  displayMode,
}) => {
  // If not a file result, don't render
  if (part.type !== 'file_result') return null;

  // File metadata parsing
  const fileName = part.path ? part.path.split('/').pop() || part.path : '';
  const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';

  const fileType = determineFileType(fileExtension);
  const isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(fileExtension);
  const isMarkdownFile = ['md', 'markdown'].includes(fileExtension);
  const isCodeFile = fileType === 'code';

  const approximateSize =
    typeof part.content === 'string' ? formatBytes(part.content.length) : 'Unknown size';

  // Get language for code highlighting
  const getLanguage = (): string => {
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      xml: 'xml',
      sh: 'bash',
      bash: 'bash',
      go: 'go',
      c: 'c',
      cpp: 'cpp',
      rs: 'rust',
      php: 'php',
      sql: 'sql',
      scss: 'scss',
      less: 'less',
      vue: 'vue',
      svelte: 'svelte',
    };

    return langMap[fileExtension] || fileExtension || 'text';
  };

  // Format file size
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Handle file download
  const handleDownload = () => {
    const blob = new Blob([part.content], { type: isHtmlFile ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Content preview area */}
      <div className="overflow-hidden">
        {/* File content display */}
        <div className="overflow-hidden">
          {isHtmlFile && displayMode === 'rendered' ? (
            <div className="border border-gray-200/50 dark:border-gray-700/30 rounded-lg overflow-hidden bg-white dark:bg-gray-900/30">
              <iframe
                srcDoc={part.content}
                className="w-full border-0 min-h-[100vh]"
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : isImageFile ? (
            <div className="text-center p-4">
              <img
                src={`data:image/${fileExtension};base64,${part.content}`}
                alt={part.path}
                className="max-w-full mx-auto border border-gray-200/50 dark:border-gray-700/30 rounded-lg"
              />
            </div>
          ) : isCodeFile || (isHtmlFile && displayMode === 'source') ? (
            <div className="p-0">
              <CodeEditor
                code={part.content}
                language={getLanguage()}
                fileName={fileName}
                filePath={part.path}
                fileSize={approximateSize}
                showLineNumbers={true}
                maxHeight={MAX_HEIGHT_CALC}
                className="rounded-none border-0"
                onCopy={handleDownload}
              />
            </div>
          ) : isMarkdownFile ? (
            displayMode === 'source' ? (
              <div className="p-0">
                <CodeEditor
                  code={part.content}
                  language="markdown"
                  fileName={fileName}
                  filePath={part.path}
                  fileSize={approximateSize}
                  showLineNumbers={true}
                  maxHeight={MAX_HEIGHT_CALC}
                  className="rounded-none border-0"
                />
              </div>
            ) : (
              <div className="prose dark:prose-invert prose-sm max-w-none p-4 pt-0">
                <MessageContent
                  message={part.content}
                  isMarkdown={true}
                  displayMode={displayMode as DisplayMode}
                  isShortMessage={false}
                />
              </div>
            )
          ) : (
            <div className="p-0">
              <CodeEditor
                code={part.content}
                language="text"
                fileName={fileName}
                filePath={part.path}
                fileSize={approximateSize}
                showLineNumbers={true}
                maxHeight={MAX_HEIGHT_CALC}
                className="rounded-none border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function for file type determination
function determineFileType(extension: string): 'code' | 'document' | 'image' | 'other' {
  if (
    ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'php', 'html', 'css'].includes(extension)
  ) {
    return 'code';
  }
  if (['md', 'txt', 'docx', 'pdf', 'rtf', 'markdown'].includes(extension)) {
    return 'document';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) {
    return 'image';
  }
  return 'other';
}
