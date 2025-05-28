import React from 'react';
import { ToolResultContentPart } from '../../../types';
import { FiMonitor, FiExternalLink, FiGlobe, FiBookmark, FiCopy, FiCheck } from 'react-icons/fi';
import { BrowserShell } from './BrowserShell';
import { MarkdownRenderer } from '../../Markdown';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface BrowserResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders browser navigation and page content results with improved UI
 *
 * Design improvements:
 * - Enhanced browser shell with realistic browser chrome
 * - Better visual hierarchy and content spacing
 * - Quick action buttons for URL interaction
 * - Proper content formatting with support for different content types
 * - Smooth animations for state changes
 */
export const BrowserResultRenderer: React.FC<BrowserResultRendererProps> = ({ part }) => {
  const { url, content, title } = part;
  const [copied, setCopied] = useState(false);

  const displayTitle = title || url?.split('/').pop() || 'Browser Result';

  if (!url && !content) {
    return <div className="text-gray-500 italic">Browser result is empty</div>;
  }

  const copyUrl = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        {/* <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-100/70 dark:border-purple-800/30 flex items-center justify-center mr-4 text-purple-600 dark:text-purple-400 shadow-sm">
            <FiMonitor size={24} />
          </div>
          <div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
              {title || 'Browser Navigation'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Web page content retrieved</p>
          </div>
        </div> */}

        {/* URL actions bar */}
        {/* {url && (
          <div className="mb-4 flex items-center">
            <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg text-sm border border-gray-100/30 dark:border-gray-700/20 flex items-center overflow-hidden">
              <FiGlobe className="flex-shrink-0 text-gray-400 dark:text-gray-500 mr-2" size={16} />
              <span className="truncate text-gray-700 dark:text-gray-300 mr-2">{url}</span>
            </div>
            <div className="flex ml-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={copyUrl}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200/50 dark:border-gray-700/30"
                title="Copy URL"
              >
                {copied ? <FiCheck size={18} className="text-green-500" /> : <FiCopy size={18} />}
              </motion.button>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors border border-purple-200/50 dark:border-purple-800/30"
                title="Open in new tab"
              >
                <FiExternalLink size={18} />
              </motion.a>
            </div>
          </div>
        )} */}

        {/* Content with enhanced browser shell */}
        <BrowserShell title={displayTitle} url={url}>
          <div className="bg-white dark:bg-gray-800 p-5 min-h-[200px] max-h-[70vh] overflow-auto border-t border-gray-100/30 dark:border-gray-700/20">
            {typeof content === 'string' ? (
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <MarkdownRenderer content={content} />
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100/30 dark:border-gray-700/20 overflow-x-auto">
                {JSON.stringify(content, null, 2)}
              </pre>
            )}
          </div>
        </BrowserShell>
      </div>
    </div>
  );
};
