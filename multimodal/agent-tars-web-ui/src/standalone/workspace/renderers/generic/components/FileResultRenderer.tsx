import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCode, FiEye, FiDownload, FiCopy, FiCheck } from 'react-icons/fi';
import { ToolResultContentPart } from '../../../types';
import { MessageContent } from './MessageContent';
import { DisplayMode } from '../types';
import { wrapMarkdown } from '@/common/utils/markdown';
import { determineFileType, getFileIcon } from '../utils';

interface FileResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

export const FileResultRenderer: React.FC<FileResultRendererProps> = ({ part, onAction }) => {
  const [htmlPreviewMode, setHtmlPreviewMode] = useState<'code' | 'preview'>('code');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('source');
  const [copied, setCopied] = useState(false);

  // 如果不是文件结果，则不渲染
  if (part.type !== 'file_result') return null;

  // 文件元数据解析
  const fileName = part.path ? part.path.split('/').pop() || part.path : '';
  const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  console.log('fileName', fileName, fileExtension);

  const fileType = determineFileType(fileExtension);
  const isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(fileExtension);
  const isMarkdownFile = ['md', 'markdown'].includes(fileExtension);
  const approximateSize =
    typeof part.content === 'string' ? formatBytes(part.content.length) : 'Unknown size';

  // 判断是否应该提供视图切换选项
  const shouldOfferToggle =
    isMarkdownFile && typeof part.content === 'string' && part.content.length > 100;

  // 获取语言用于代码高亮
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

    return langMap[fileExtension] || fileExtension || 'markdown';
  };

  // 格式化文件大小
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 处理文件下载
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

  // 复制内容到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(part.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 文件信息头部 */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100/80 dark:bg-gray-700/80 flex items-center justify-center mr-3 border border-gray-200/50 dark:border-gray-700/30">
            {getFileIcon(fileExtension)}
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">{fileName}</h3>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span
                className="mr-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80%]"
                title={part.path}
              >
                {part.path}
              </span>
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

      {/* 内容预览区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 overflow-hidden">
        {/* HTML文件的切换按钮 */}
        {isHtmlFile && (
          <div className="flex border-b border-gray-100/60 dark:border-gray-700/30">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                htmlPreviewMode === 'code'
                  ? 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
              onClick={() => setHtmlPreviewMode('code')}
            >
              <div className="flex items-center justify-center">
                <FiCode className="mr-2" size={16} />
                Source Code
              </div>
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                htmlPreviewMode === 'preview'
                  ? 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
              onClick={() => setHtmlPreviewMode('preview')}
            >
              <div className="flex items-center justify-center">
                <FiEye className="mr-2" size={16} />
                Preview
              </div>
            </button>
          </div>
        )}

        {/* Markdown文件的切换按钮 */}
        {isMarkdownFile && shouldOfferToggle && (
          <div className="flex justify-end p-2 border-b border-gray-100/60 dark:border-gray-700/30">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setDisplayMode('source')}
                className={`px-3 py-1.5 text-xs font-medium ${
                  displayMode === 'source'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                } rounded-l-lg border border-gray-200 dark:border-gray-600`}
              >
                <div className="flex items-center">
                  <FiCode className="mr-1.5" size={12} />
                  <span>Source</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('rendered')}
                className={`px-3 py-1.5 text-xs font-medium ${
                  displayMode === 'rendered'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                } rounded-r-lg border border-gray-200 dark:border-gray-600 border-l-0`}
              >
                <div className="flex items-center">
                  <FiEye className="mr-1.5" size={12} />
                  <span>Rendered</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 文件内容显示 */}
        <div className="p-4 overflow-auto max-h-[70vh]">
          {isHtmlFile && htmlPreviewMode === 'preview' ? (
            <div className="border border-gray-200/50 dark:border-gray-700/30 rounded-lg overflow-hidden bg-white dark:bg-gray-900/30">
              <div className="overflow-auto">
                <iframe
                  srcDoc={part.content}
                  className="w-full border-0 min-h-[100vh]"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          ) : isImageFile ? (
            <div className="text-center">
              <img
                src={`data:image/${fileExtension};base64,${part.content}`}
                alt={part.path}
                className="max-w-full mx-auto border border-gray-200/50 dark:border-gray-700/30 rounded-lg"
              />
            </div>
          ) : isMarkdownFile ? (
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <MessageContent
                message={part.content}
                isMarkdown={true}
                displayMode={displayMode}
                isShortMessage={false}
              />
            </div>
          ) : (
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <MessageContent
                message={wrapMarkdown(part.content, getLanguage())}
                isMarkdown={false}
                displayMode="rendered"
                isShortMessage={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
