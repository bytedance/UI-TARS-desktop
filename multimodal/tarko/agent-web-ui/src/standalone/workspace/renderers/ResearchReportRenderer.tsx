import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

import { FiDownload, FiBookOpen, FiLoader, FiShare2, FiCopy, FiCheck } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';

interface ResearchReportRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Research Report Renderer - Displays a detailed research report with proper formatting
 *
 * Features:
 * - Elegant markdown rendering with document styling
 * - Download capability for saving reports
 * - Animated indicators for streaming content
 * - Smooth transitions for content updates
 * - Auto-scrolling during streaming updates
 */
export const ResearchReportRenderer: React.FC<ResearchReportRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  const [scrollToBottom, setScrollToBottom] = useState(true);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract content and metadata from panelContent
  const content = getReportContent(panelContent);
  const title = panelContent.title || 'Research Report';
  const isStreaming = Boolean(panelContent.isStreaming);

  // Handle content formatting to ensure it's always a string
  const formattedContent = React.useMemo(() => {
    if (typeof content === 'string') {
      return content;
    }

    // If not a string, try to convert to JSON string
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return String(content);
    }
  }, [content]);

  // Auto-scroll to bottom when streaming content
  useEffect(() => {
    if (isStreaming && scrollToBottom && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming, scrollToBottom]);

  // Handle content scroll
  function handleScroll() {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setScrollToBottom(isNearBottom);
  }

  // Handle report download
  const handleDownload = () => {
    const blob = new Blob([formattedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^\w\s-]/g, '')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  // Handle copy content
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/80 dark:bg-gray-900/20">
      {/* Report header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
        <div className="flex items-center">
          <div className="w-10 h-10 mr-4 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 flex items-center justify-center border border-accent-100/50 dark:border-accent-800/30 text-accent-600 dark:text-accent-400 shadow-sm">
            <FiBookOpen size={18} />
          </div>
          <div>
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
              {title}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              {isStreaming ? (
                <>
                  <FiLoader className="mr-1.5 animate-spin" size={10} />
                  Generating report...
                </>
              ) : (
                'Research Report'
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="p-2 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors border border-gray-200/50 dark:border-gray-700/30"
            title="Copy content"
          >
            {copied ? <FiCheck size={20} className="text-green-500" /> : <FiCopy size={20} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="p-2 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors border border-gray-200/50 dark:border-gray-700/30"
            title="Download Report"
          >
            <FiDownload size={20} />
          </motion.button>
        </div>
      </div>

      {/* Report content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-auto workspace-scrollbar bg-white dark:bg-gray-800 "
        onScroll={handleScroll}
      >
        <div className="p-8">
          <div className="research-report prose prose-slate lg:prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer content={formattedContent} />
          </div>

          {/* Loading indicator for streaming content */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center py-6 mt-4 text-accent-500 dark:text-accent-400"
            >
              <div className="flex items-center gap-3 px-4 py-2 bg-accent-50/70 dark:bg-accent-900/20 rounded-full border border-accent-100/60 dark:border-accent-800/30">
                <FiLoader className="animate-spin" size={16} />
                <span className="text-sm font-medium">Generating report...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

function getReportContent(panelContent: StandardPanelContent): string {
  if (typeof panelContent.source === 'string') {
    return panelContent.source;
  }
  return JSON.stringify(panelContent.source, null, 2);
}
