import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import {
  FiCheck,
  FiInfo,
  FiLink,
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

  const content = processContent();
  const [showDetails, setShowDetails] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);
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

  // Trigger success animation
  useEffect(() => {
    if (resultInfo.type === 'success') {
      setAnimateSuccess(true);
      const timer = setTimeout(() => setAnimateSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [resultInfo.type]);

  // Special handling: if content includes "Navigated to", extract URL and set as navigation operation
  if (typeof content === 'string' && content.includes('Navigated to')) {
    const url = content.split('\n')[0].replace('Navigated to ', '').trim();
    resultInfo.operation = 'navigate';
    resultInfo.url = url;
    resultInfo.type = 'success';
    resultInfo.title = 'Navigation Successful';
  }

  // Add special handling for navigation operations
  const isNavigationOperation =
    part.name?.includes('navigate') ||
    (typeof parsedContent === 'object' && parsedContent?.url) ||
    resultInfo.operation === 'navigate';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
        {/* Status header */}
        <div
          className={`py-4 px-5 flex items-center justify-between border-b ${getHeaderClasses(resultInfo.type)}`}
        >
          <div className="flex items-center">
            <div className="mr-3 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={resultInfo.type}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {getStatusIcon(resultInfo.type, resultInfo.operation)}
                </motion.div>
              </AnimatePresence>

              {/* Success animation effect */}
              {animateSuccess && resultInfo.type === 'success' && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-green-500 dark:bg-green-400 z-0"
                />
              )}
            </div>
            <div>
              <motion.span
                className="font-medium"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
              >
                {part.name || resultInfo.title}
              </motion.span>
              {resultInfo.operation && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getOperationDescription(resultInfo.operation, resultInfo)}
                </div>
              )}
            </div>
          </div>

          {/* Add URL display (for browser tools) */}
          {resultInfo.url && (
            <div className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors group">
              <FiLink size={12} className="mr-1 group-hover:text-accent-500" />
              <a
                href={resultInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[200px] truncate hover:underline transition-all"
              >
                {resultInfo.url}
              </a>
            </div>
          )}
        </div>

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
                {typeof resultInfo.message === 'string' && isMarkdownContent ? (
                  displayMode === 'source' ? (
                    <pre className="whitespace-pre-wrap text-sm p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md overflow-x-auto border border-gray-200/50 dark:border-gray-700/30 font-mono">
                      {resultInfo.message}
                    </pre>
                  ) : (
                    <div className="prose dark:prose-invert prose-sm max-w-none">
                      <MarkdownRenderer content={resultInfo.message} />
                    </div>
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

          {/* Detail toggle button - only shown when additional details exist */}
          {resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="mt-2 mb-3"
            >
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
              >
                <motion.div
                  animate={{ rotate: showDetails ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiArrowRight size={12} className="mr-1.5" />
                </motion.div>
                {showDetails ? 'Hide Details' : 'View Details'}
              </button>
            </motion.div>
          )}

          {/* Details area - only shown when additional details exist */}
          <AnimatePresence>
            {showDetails && resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/30">
                  <div className="grid gap-2">
                    {Object.entries(resultInfo.details).map(([key, value]) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start"
                      >
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">
                          {formatKey(key)}:
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {formatValue(value)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
