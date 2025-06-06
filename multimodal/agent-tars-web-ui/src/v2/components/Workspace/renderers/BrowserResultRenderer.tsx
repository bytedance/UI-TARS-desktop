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
  const { url, content, title, contentType } = part;
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

  // Extract URL from text content if it's in the format "Navigated to URL"
  const extractUrlFromContent = () => {
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const lines = content.split('\n');
      const firstLine = lines[0] || '';
      return firstLine.replace('Navigated to ', '').trim();
    }
    return url || '';
  };

  // Extract content from text after URL line
  const extractContentFromText = () => {
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const lines = content.split('\n');
      return lines.slice(1).join('\n');
    }
    return content;
  };

  const extractedUrl = extractUrlFromContent();
  const extractedContent = extractContentFromText();

  return (
    <div className="space-y-4">
      <div className="mb-4">
        {/* URL actions bar */}
        {extractedUrl && (
          <div className="mb-4 flex items-center">
            <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg text-sm border border-gray-100/30 dark:border-gray-700/20 flex items-center overflow-hidden">
              <FiGlobe className="flex-shrink-0 text-gray-400 dark:text-gray-500 mr-2" size={16} />
              <span className="truncate text-gray-700 dark:text-gray-300 mr-2">{extractedUrl}</span>
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
                href={extractedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors border border-purple-200/50 dark:border-purple-800/30"
                title="Open in new tab"
              >
                <FiExternalLink size={18} />
              </motion.a>
            </div>
          </div>
        )}

        {/* Content with enhanced browser shell */}
        <BrowserShell title={displayTitle} url={extractedUrl}>
          <div className="bg-white dark:bg-gray-800 px-5 min-h-[200px] max-h-[70vh] overflow-auto border-t border-gray-100/30 dark:border-gray-700/20">
            {contentType === 'text' || typeof extractedContent === 'string' ? (
              <div className="prose dark:prose-invert prose-sm max-w-none py-4">
                <MarkdownRenderer content={typeof extractedContent === 'string' ? extractedContent : ''} />
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100/30 dark:border-gray-700/20 overflow-x-auto">
                {JSON.stringify(extractedContent, null, 2)}
              </pre>
            )}
          </div>
        </BrowserShell>
      </div>
    </div>
  );
};
