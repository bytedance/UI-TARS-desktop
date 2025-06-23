import React, { useState } from 'react';
import { ToolResultContentPart } from '../types';
import { motion } from 'framer-motion';
import { FiFileText, FiCode, FiEye, FiDownload, FiCopy, FiCheck } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';

interface FileResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders file operation results with preview capabilities
 *
 * Features:
 * - Content preview with syntax highlighting
 * - Special handling for HTML files with preview mode
 * - File download functionality
 * - Clean interface with visual file type indicators
 * - Support for code copy functionality
 */
export const FileResultRenderer: React.FC<FileResultRendererProps> = ({ part, onAction }) => {
  const { path, content } = part;
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);

  if (!path) {
    return <div className="text-gray-500 italic">File path missing</div>;
  }

  if (!content && content !== '') {
    return <div className="text-gray-500 italic">No file content available</div>;
  }

  // Determine file extension
  const extension = path.split('.').pop()?.toLowerCase() || '';
  const isHtml = extension === 'html' || extension === 'htm';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension);
  const isText = [
    'txt',
    'md',
    'js',
    'jsx',
    'ts',
    'tsx',
    'css',
    'json',
    'yaml',
    'yml',
    'html',
    'htm',
    'xml',
  ].includes(extension);
  const isCode = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'java',
    'c',
    'cpp',
    'go',
    'rs',
    'php',
    'rb',
  ].includes(extension);
  const isConfig = ['json', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf'].includes(extension);

  // Get file basename (without directory path)
  const fileName = path.split('/').pop() || path;

  // Determine icon and color based on file type
  const getFileIcon = () => {
    if (isHtml) return <FiCode size={18} className="text-orange-500 dark:text-orange-400" />;
    if (isImage) return <FiEye size={18} className="text-blue-500 dark:text-blue-400" />;
    if (isCode) return <FiCode size={18} className="text-accent-500 dark:text-accent-400" />;
    if (isConfig) return <FiFileText size={18} className="text-amber-500 dark:text-amber-400" />;
    return <FiFileText size={18} className="text-gray-600 dark:text-gray-400" />;
  };

  // Create downloadable content
  const handleDownload = () => {
    const blob = new Blob([content], { type: isHtml ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy content to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const approximateSize = content ? formatBytes(content.length) : 'Unknown size';

  // Detect language for code highlighting
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
    };

    return langMap[extension] || extension || 'text';
  };

  return (
    <div className="space-y-4">
      {/* File info header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100/80 dark:bg-gray-700/80 flex items-center justify-center mr-3 border border-gray-200/50 dark:border-gray-700/30">
            {getFileIcon()}
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">{fileName}</h3>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="mr-3">{path}</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                {approximateSize}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Copy content"
          >
            {copied ? <FiCheck size={18} className="text-green-500" /> : <FiCopy size={18} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download file"
          >
            <FiDownload size={18} />
          </motion.button>
        </div>
      </div>

      {/* Content preview section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 overflow-hidden">
        {/* Toggle buttons for HTML files */}
        {isHtml && (
          <div className="flex border-b border-gray-100/60 dark:border-gray-700/30">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                previewMode === 'code'
                  ? 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
              onClick={() => setPreviewMode('code')}
            >
              <div className="flex items-center justify-center">
                <FiCode className="mr-2" size={16} />
                Source Code
              </div>
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                previewMode === 'preview'
                  ? 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
              onClick={() => setPreviewMode('preview')}
            >
              <div className="flex items-center justify-center">
                <FiEye className="mr-2" size={16} />
                Preview
              </div>
            </button>
          </div>
        )}

        {/* Content display */}
        <div className="p-4">
          {isHtml && previewMode === 'preview' ? (
            <div className="border border-gray-200/50 dark:border-gray-700/30 rounded-lg overflow-hidden bg-white dark:bg-gray-900/30">
              <div className="px-3 py-2 bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200/50 dark:border-gray-700/30 text-xs font-medium text-gray-700 dark:text-gray-300">
                Preview
              </div>
              <div className="p-4 max-h-[70vh] overflow-auto">
                <iframe
                  srcDoc={content}
                  className="w-full border-0 min-h-[400px]"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          ) : isImage ? (
            <div className="text-center">
              <img
                src={`data:image/${extension};base64,${content}`}
                alt={path}
                className="max-h-[70vh] max-w-full mx-auto border border-gray-200/50 dark:border-gray-700/30 rounded-lg"
              />
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <MarkdownRenderer content={`\`\`\`\`\`${getLanguage()}\n${content}\n\`\`\`\`\``} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
