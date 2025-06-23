import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import {
  FiCheck,
  FiInfo,
  FiLink,
  FiImage,
  FiArrowRight,
  FiCornerUpRight,
  FiCode,
  FiEye,
} from 'react-icons/fi';

import { ToolResultContentPart } from '../../types';
import { DisplayMode, AnalyzedResult } from './types';
import {
  analyzeResult,
  getStatusIcon,
  getOperationDescription,
  getHeaderClasses,
  formatKey,
  formatValue,
} from './utils';
import { BrowserShell } from '../BrowserShell';

interface GenericResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * GenericResultRenderer - Intelligently analyzes and renders tool results in any format
 *
 * Features:
 * - Automatically identifies common status patterns (success/failure/info)
 * - Extracts and highlights key information
 * - Handles various data structures elegantly
 * - Provides consistent card-based layout
 * - Implements smooth transition animations
 * - Offers specialized visualizations for different operation types
 * - Supports toggle between source/rendered modes for Markdown content
 */
export const GenericResultRenderer: React.FC<GenericResultRendererProps> = ({ part }) => {
  // Process different content formats
  const processContent = (): any => {
    // If content is an array (e.g., from browser_navigate and browser_get_markdown)
    if (Array.isArray(part.data)) {
      // Look for text content in the array
      const textContent = part.data.find((item) => item.type === 'text');
      if (textContent && textContent.text) {
        return textContent.text;
      }
    }

    return part.text || part.data || {};
  };

  console.log('part', part);

  const content = processContent();
  // State to track the current display mode (source or rendered) for markdown content
  const [displayMode, setDisplayMode] = useState<DisplayMode>('source');

  // Try to parse string content as JSON
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // Not valid JSON, keep as string
      parsedContent = content;
    }
  }

  // Intelligently detect result type
  const resultInfo = analyzeResult(parsedContent, part.name);

  // Special handling: if content includes "Navigated to", extract URL and set as navigation operation
  if (typeof content === 'string' && content.includes('Navigated to')) {
    const splits = content.split('\n');
    const url = splits[0].replace('Navigated to ', '').trim();
    resultInfo.operation = 'navigate';
    resultInfo.url = url;
    resultInfo.type = 'success';
    resultInfo.title = 'Navigation Successful';
    resultInfo.details = splits.slice(1);
  }

  // Add special handling for navigation operations
  const isNavigationOperation =
    part.name?.includes('navigate') ||
    (typeof parsedContent === 'object' && parsedContent?.url) ||
    resultInfo.operation === 'navigate';

  // Check for screenshot in _extra field (new)
  const hasScreenshot = part._extra && part._extra.currentScreenshot;

  // Detect if content is Markdown
  const isPossibleMarkdown = (text: string): boolean => {
    // Check for common Markdown syntax patterns
    const markdownPatterns = [
      /^#+\s+.+$/m, // Headers
      /\[.+\]\(.+\)/, // Links
      /\*\*.+\*\*/, // Bold
      /\*.+\*/, // Italic
      /```[\s\S]*```/, // Code blocks
      /^\s*-\s+.+$/m, // Unordered lists
      /^\s*\d+\.\s+.+$/m, // Ordered lists
      />\s+.+/, // Blockquotes
      /!\[.+\]\(.+\)/, // Images
      /^---$/m, // Horizontal rules
      /^\|.+\|$/m, // Tables
      /^\s*\[\d+\].*$/m, // Numbered references like [1], [2]
      /^\s*\[FILE\].*$/m, // File annotations
      /^\s*\[DIR\].*$/m, // Directory annotations
    ];

    // If content matches at least two Markdown patterns, or is lengthy with one pattern, consider it Markdown
    const matchCount = markdownPatterns.filter((pattern) => pattern.test(text)).length;
    return matchCount >= 2 || (text.length > 500 && matchCount >= 1);
  };

  // Special handling for browser_get_markdown results
  const isMarkdownContent =
    part.name?.includes('markdown') ||
    part.name?.includes('browser_get_markdown') ||
    (typeof content === 'string' && isPossibleMarkdown(content));

  // Determine if we should show the toggle button
  const shouldOfferToggle =
    isMarkdownContent && typeof resultInfo.message === 'string' && resultInfo.message.length > 100;

  // Check if this is a very short string that should be displayed prominently
  const isShortString =
    typeof resultInfo.message === 'string' && resultInfo.message.length < 80 && !isMarkdownContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
        {/* Screenshot from _extra field (new) */}
        {hasScreenshot && (
          <BrowserShell title={resultInfo.title} url={resultInfo.url}>
            <img
              src={part._extra.currentScreenshot}
              alt={'Image'}
              className="w-full h-auto object-contain"
            />
          </BrowserShell>
        )}
        {/* Content area */}
        <div className="p-5 relative">
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
                className="text-gray-700 dark:text-gray-300 mb-4"
              >
                {isShortString && !hasScreenshot ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{
                      duration: 0.5,
                      ease: 'easeOut',
                    }}
                    className="text-center"
                    style={{
                      fontSize: '30px',
                      height: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      WebkitTextFillColor: 'transparent',
                      padding: '3rem',
                      borderRadius: '8px',
                    }}
                  >
                    {resultInfo.message}
                  </motion.div>
                ) : typeof resultInfo.message === 'string' && isMarkdownContent ? (
                  displayMode === 'source' ? (
                    <MarkdownRenderer content={`\`\`\`\`\`md\n${resultInfo.message}\n\`\`\`\`\``} />
                  ) : (
                    <MarkdownRenderer
                      className="prose dark:prose-invert prose-sm max-w-none"
                      content={resultInfo.message}
                    />
                  )
                ) : (
                  resultInfo.message
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Special handling for navigation operations */}
          {isNavigationOperation && resultInfo.type === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4"
            >
              <div className="flex items-center mt-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FiCornerUpRight className="text-accent-500 dark:text-accent-400" size={16} />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Navigated to</div>
                  <div className="font-medium text-accent-600 dark:text-accent-400 flex items-center">
                    {resultInfo.url}
                  </div>
                </div>
              </div>

              {/* Navigation animation */}
              <div className="my-5 px-3">
                <div className="relative h-0.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0, x: 0 }}
                    animate={{ width: '100%', x: ['0%', '100%'] }}
                    transition={{
                      duration: 1.5,
                      width: { duration: 0 },
                      x: { duration: 1.5, ease: 'easeInOut' },
                    }}
                    className="absolute top-0 left-0 h-full bg-accent-500 dark:bg-accent-400 rounded-full"
                    style={{ width: '30%' }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Details area - always shown now */}
          {resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
            <div className="mt-3 pt-3">
              <div className="grid gap-2">
                {Object.entries(resultInfo.details).map(([key, value]) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start"
                  >
                    <div className="text-sm font-light text-gray-500 dark:text-gray-400 w-[auto  ] flex-shrink-0">
                      {formatKey(key)} &nbsp;
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatValue(value)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state handling - enhanced version */}
          {!resultInfo.message &&
            !resultInfo.url &&
            (!resultInfo.details || Object.keys(resultInfo.details).length === 0) && (
              <div className="flex flex-col items-center justify-center py-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 100,
                  }}
                  className="flex flex-col items-center"
                >
                  {resultInfo.type === 'success' ? (
                    <>
                      <div className="w-12 h-12 mb-3 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 dark:text-green-400">
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            repeatDelay: 1,
                          }}
                        >
                          <FiCheck size={24} />
                        </motion.div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                          The operation completed successfully
                        </div>
                        {resultInfo.operation && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getOperationDescription(resultInfo.operation, resultInfo)}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <FiInfo size={24} />
                      </div>
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        {resultInfo.type === 'empty'
                          ? 'No content available'
                          : 'Operation completed'}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};
