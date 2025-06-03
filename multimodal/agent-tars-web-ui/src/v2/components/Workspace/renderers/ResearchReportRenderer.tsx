import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiBookOpen, FiLoader } from 'react-icons/fi';
import { MarkdownRenderer } from '../../Markdown';

interface ResearchReportRendererProps {
  content: string;
  title?: string;
  isStreaming?: boolean;
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
  content,
  title = 'Research Report',
  isStreaming = false,
}) => {
  const [scrollToBottom, setScrollToBottom] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // 处理内容格式化，确保始终是字符串
  const formattedContent = React.useMemo(() => {
    if (typeof content === 'string') {
      return content;
    }

    // 如果不是字符串，尝试转换为 JSON 字符串
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
  const handleScroll = () => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setScrollToBottom(isNearBottom);
  };

  // Handle report download
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^\w\s-]/g, '')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Report header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 rounded-xl bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/30 flex items-center justify-center border border-accent-200/40 dark:border-accent-700/30">
            <FiBookOpen className="text-accent-600 dark:text-accent-400" size={18} />
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

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          className="ml-3 p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 hover:text-accent-600 dark:hover:text-accent-400 transition-colors border border-transparent hover:border-gray-100/40 dark:hover:border-gray-700/30"
          title="Download Report"
        >
          <FiDownload size={20} />
        </motion.button>
      </div>

      {/* Report content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-auto p-6 bg-white dark:bg-gray-800"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto">
          <div className="research-report prose prose-slate lg:prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer content={formattedContent} />
          </div>

          {/* Loading indicator for streaming content */}
          {isStreaming && (
            <div className="flex items-center justify-center py-6 text-accent-500 dark:text-accent-400">
              <FiLoader className="animate-spin mr-2" size={16} />
              <span className="text-sm">Generating report...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
