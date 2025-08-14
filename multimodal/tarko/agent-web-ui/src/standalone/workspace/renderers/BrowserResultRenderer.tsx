import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FiMonitor, FiExternalLink, FiGlobe, FiBookmark, FiCopy, FiCheck } from 'react-icons/fi';
import { BrowserShell } from './BrowserShell';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FileDisplayMode } from '../types';

interface BrowserResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Renders browser navigation and page content results with improved UI
 */
export const BrowserResultRenderer: React.FC<BrowserResultRendererProps> = ({ panelContent }) => {
  const [copied, setCopied] = useState(false);

  // Extract browser result data from panelContent
  const browserData = extractBrowserResultData(panelContent);

  if (!browserData) {
    return <div className="text-gray-500 italic">Browser result is empty</div>;
  }

  const { url, content, title, contentType, screenshot } = browserData;
  const displayTitle = title || url?.split('/').pop() || 'Browser Result';

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
                className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-accent-600 dark:text-accent-400 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors border border-purple-200/50 dark:border-purple-800/30"
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
            {screenshot && (
              <div className="py-4">
                <img
                  src={screenshot}
                  alt="Browser Screenshot"
                  className="w-full h-auto rounded-md"
                />
              </div>
            )}

            {(contentType === 'text' || typeof extractedContent === 'string') &&
            extractedContent ? (
              <div className="prose dark:prose-invert prose-sm max-w-none py-4">
                <MarkdownRenderer
                  content={typeof extractedContent === 'string' ? extractedContent : ''}
                />
              </div>
            ) : (
              !screenshot && (
                <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100/30 dark:border-gray-700/20 overflow-x-auto">
                  {JSON.stringify(extractedContent, null, 2)}
                </pre>
              )
            )}
          </div>
        </BrowserShell>
      </div>
    </div>
  );
};

function extractBrowserResultData(panelContent: StandardPanelContent): {
  url?: string;
  content?: string;
  title?: string;
  contentType?: string;
  screenshot?: string;
} | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { url, content, title, contentType } = panelContent.arguments;

      return {
        url: url ? String(url) : undefined,
        content: content ? String(content) : undefined,
        title: title ? String(title) : undefined,
        contentType: contentType ? String(contentType) : undefined,
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { url, content, title, contentType } = sourceObj;

      return {
        url: url ? String(url) : undefined,
        content: content ? String(content) : undefined,
        title: title ? String(title) : undefined,
        contentType: contentType ? String(contentType) : undefined,
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }

    // If source is a string, treat it as content
    if (typeof panelContent.source === 'string') {
      return {
        content: panelContent.source,
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract browser result data:', error);
    return null;
  }
}
