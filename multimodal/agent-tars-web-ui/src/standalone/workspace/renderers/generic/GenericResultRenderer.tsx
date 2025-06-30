import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCode, FiEye, FiDownload, FiCopy, FiCheck, FiFileText } from 'react-icons/fi';
import { ToolResultContentPart } from '../../types';
import { DisplayMode, AnalyzedResult } from './types';
import {
  analyzeResult,
  extractImagesFromContent,
  isImageUrl,
  isPossibleMarkdown,
  determineFileType,
  getFileIcon,
} from './utils';
import { BrowserShell } from '../BrowserShell';
import {
  ImageContent,
  MessageContent,
  JsonContent,
  OperationHeader,
  StatusIndicator,
} from './components';
import { formatKey, formatValue } from './utils';
import { wrapMarkdown } from '@/common/utils/markdown';

interface GenericResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * GenericResultRenderer - Intelligently analyzes and renders tool results in any format
 *
 * This component has been refactored to have clearer responsibilities:
 * 1. Content analysis and categorization
 * 2. Selecting appropriate rendering strategy
 * 3. Delegating specific rendering to specialized components
 */
export const GenericResultRenderer: React.FC<GenericResultRendererProps> = ({ part, onAction }) => {
  // State for content display mode
  const [displayMode, setDisplayMode] = useState<DisplayMode>('source');
  // State for copied status
  const [copied, setCopied] = useState(false);
  // State for HTML preview mode
  const [htmlPreviewMode, setHtmlPreviewMode] = useState<'code' | 'preview'>('code');

  // Process content from different formats
  const content = React.useMemo(() => {
    // Handle array content (e.g., from browser_navigate and browser_get_markdown)
    if (Array.isArray(part.data)) {
      // Look for text content in the array
      const textContent = part.data.find((item) => item.type === 'text');
      if (textContent && textContent.text) {
        return textContent.text;
      }
    }
    return part.text || part.data || {};
  }, [part.data, part.text]);

  // Extract image URLs and check if the content is purely an image or contains images
  const { images, hasImages, textContent } = React.useMemo(
    () =>
      typeof content === 'string'
        ? extractImagesFromContent(content)
        : { images: [], hasImages: false, textContent: content },
    [content],
  );

  // Is the content purely an image URL (single image URL with no other text)
  const isPureImageUrl = hasImages && images.length === 1 && textContent === '';

  // Check for screenshot in _extra field
  const hasScreenshot = part._extra && part._extra.currentScreenshot;

  // Try to parse string content as JSON if not a pure image URL
  const parsedContent = React.useMemo(() => {
    if (typeof content === 'string' && !isPureImageUrl) {
      try {
        return JSON.parse(content);
      } catch (e) {
        return content;
      }
    }
    return content;
  }, [content, isPureImageUrl]);

  // Analyze result to determine type and extract key information
  const resultInfo = React.useMemo(() => {
    const result = analyzeResult(parsedContent, part.name);

    // Special handling: extract navigation URL if content includes "Navigated to"
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const splits = content.split('\n');
      const url = splits[0].replace('Navigated to ', '').trim();
      return {
        ...result,
        operation: 'navigate' as const,
        url,
        type: 'success' as const,
        title: 'Navigation Successful',
        details: splits.slice(1),
      };
    }

    return result;
  }, [parsedContent, part.name, content]);

  // Additional content analysis
  const isNavigationOperation =
    part.name?.includes('navigate') ||
    (typeof parsedContent === 'object' && parsedContent?.url) ||
    resultInfo.operation === 'navigate';

  // Check if content is Markdown
  const isMarkdownContent = React.useMemo(() => {
    return (
      part.name?.includes('markdown') ||
      part.name?.includes('browser_get_markdown') ||
      (typeof content === 'string' && isPossibleMarkdown(content))
    );
  }, [part.name, content]);

  // File specific handling
  const isFileResult = part.type === 'file_result';
  const fileName = isFileResult && part.path ? part.path.split('/').pop() || part.path : '';
  const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  const fileType = isFileResult ? determineFileType(fileExtension) : null;
  const isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(fileExtension);
  const isMarkdownFile = ['md', 'markdown'].includes(fileExtension);
  const approximateSize =
    isFileResult && typeof part.content === 'string'
      ? formatBytes(part.content.length)
      : 'Unknown size';

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
    if (!isFileResult) return;

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

  // Copy content to clipboard
  const handleCopy = () => {
    const textToCopy = isFileResult
      ? part.content
      : typeof content === 'string'
        ? content
        : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if we should offer toggle
  const shouldOfferToggle =
    (isMarkdownContent || isMarkdownFile) &&
    typeof (isFileResult ? part.content : resultInfo.message) === 'string' &&
    (isFileResult ? part.content : resultInfo.message).length > 100;

  // Check if this is a very short string that should be displayed prominently
  const isShortString =
    typeof resultInfo.message === 'string' && resultInfo.message.length < 80 && !isMarkdownContent;

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
    };

    return langMap[fileExtension] || fileExtension || 'text';
  };

  // Pure image URL rendering
  if (isPureImageUrl) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
          <ImageContent imageUrl={images[0]} name={part.name} />
        </div>
      </div>
    );
  }

  // Screenshot rendering
  if (!isPureImageUrl && hasScreenshot) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
          <BrowserShell title={resultInfo.title} url={resultInfo.url}>
            <img
              src={part._extra.currentScreenshot}
              alt="Browser Screenshot"
              className="w-full h-auto object-contain"
            />
          </BrowserShell>
        </div>
      </div>
    );
  }

  // Special handling for file results
  if (isFileResult) {
    return (
      <div className="space-y-4">
        {/* File info header */}
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

        {/* Content preview section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 overflow-hidden">
          {/* Toggle buttons for HTML files */}
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

          {/* Toggle buttons for markdown files */}
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

          {/* File content display */}
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
                  isMarkdown={true}
                  displayMode="source"
                  isShortMessage={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main content rendering
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
        <div className="p-5 relative">
          {/* Render embedded images if present */}
          {hasImages && images.length > 0 && (
            <div className="mb-4 space-y-4">
              {images.map((imageUrl, index) => (
                <ImageContent key={index} imageUrl={imageUrl} alt={`Embedded image ${index + 1}`} />
              ))}
            </div>
          )}

          {/* Toggle button for markdown content */}
          {shouldOfferToggle && (
            <div className="flex justify-end mb-3">
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

          {/* Main message area */}
          <AnimatePresence mode="wait">
            {resultInfo.message ? (
              <motion.div
                key="message"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-gray-700 dark:text-gray-300 mb-4 text-[12px]"
              >
                {typeof resultInfo.message === 'string' ? (
                  <MessageContent
                    message={resultInfo.message}
                    isMarkdown={isMarkdownContent}
                    displayMode={displayMode}
                    isShortMessage={isShortString && !hasScreenshot}
                  />
                ) : (
                  <JsonContent data={resultInfo.message} />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Navigation operation section */}
          <OperationHeader
            title={resultInfo.title}
            url={resultInfo.url}
            operationType={resultInfo.operation}
            resultType={resultInfo.type}
          />

          {/* Details section */}
          {resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
            <div className="grid gap-2">
              {Object.entries(resultInfo.details).map(([key, value]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start"
                >
                  {/* Only display object key, ignore array index */}
                  {isNaN(Number(key)) && (
                    <div className="text-sm font-light text-gray-500 dark:text-gray-400 w-[auto] flex-shrink-0">
                      {formatKey(key)} &nbsp;
                    </div>
                  )}
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {formatValue(value)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty state handling */}
          {!resultInfo.message &&
            !resultInfo.url &&
            (!resultInfo.details || Object.keys(resultInfo.details).length === 0) && (
              <StatusIndicator
                type={resultInfo.type}
                operation={resultInfo.operation}
                details={resultInfo.details}
              />
            )}
        </div>
      </div>
    </div>
  );
};
