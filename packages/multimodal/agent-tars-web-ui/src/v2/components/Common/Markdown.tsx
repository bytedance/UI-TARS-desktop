import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { FiMaximize, FiMinimize, FiCode } from 'react-icons/fi';

interface MarkdownProps {
  children: string;
  showRaw?: boolean;
  isContentFromMarkdownTool?: boolean;
}

/**
 * Markdown Component - Renders markdown content with syntax highlighting
 *
 * Design principles:
 * - Clean, readable typography with refined spacing
 * - Elegant code blocks with subtle borders and rounded corners
 * - Consistent styling across all markdown elements
 * - Visual hierarchy through typography and spacing
 * - Option to view raw markdown content
 */
export const Markdown: React.FC<MarkdownProps> = ({ 
  children, 
  showRaw = false,
  isContentFromMarkdownTool = false 
}) => {
  const [viewRawMarkdown, setViewRawMarkdown] = useState(showRaw || isContentFromMarkdownTool);
  
  // If content is from browser_get_markdown tool, default to showing raw markdown
  const initialViewMode = isContentFromMarkdownTool ? true : showRaw;
  const [isRawView, setIsRawView] = useState(initialViewMode);

  const toggleRawView = () => {
    setIsRawView(!isRawView);
  };

  if (isRawView) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleRawView}
          className="absolute top-2 right-2 p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 z-10 flex items-center text-xs"
        >
          <FiMaximize size={12} className="mr-1" />
          <span>Render</span>
        </motion.button>
        <SyntaxHighlighter
          language="markdown"
          style={tomorrow}
          customStyle={{
            fontSize: '0.875rem',
            borderRadius: '0.5rem',
            padding: '1rem',
            backgroundColor: 'rgba(30, 41, 59, 0.04)',
            border: '1px solid rgba(226, 232, 240, 0.6)',
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <div className="relative markdown-wrapper">
      {children.length > 100 && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleRawView}
          className="absolute top-2 right-2 p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 z-10 flex items-center text-xs"
        >
          <FiCode size={12} className="mr-1" />
          <span>View Source</span>
        </motion.button>
      )}
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <motion.div
                initial={{ opacity: 0.9 }}
                whileHover={{ opacity: 1 }}
                className="rounded-xl overflow-hidden my-3"
              >
                <SyntaxHighlighter
                  style={tomorrow}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(30, 41, 59, 0.2)',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </motion.div>
            ) : (
              <code
                className={`${className} bg-gray-100/70 dark:bg-gray-800/80 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200/10 dark:border-gray-700/10`}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-4 last:mb-0">{children}</p>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-600 dark:text-accent-400 hover:underline transition-colors"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-4 last:mb-0 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-4 last:mb-0 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1 last:mb-0">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-md font-bold mb-2 mt-3">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-4 py-1 italic text-gray-600 dark:text-gray-400 mb-4">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full text-sm border-collapse border border-gray-200/40 dark:border-gray-700/20 rounded-lg">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-50/80 dark:bg-gray-800/50">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },
          tr({ children }) {
            return (
              <tr className="border-b border-gray-200/40 dark:border-gray-700/20">{children}</tr>
            );
          },
          th({ children }) {
            return <th className="p-2 text-left font-semibold border-r border-gray-200/40 dark:border-gray-700/20 last:border-0">{children}</th>;
          },
          td({ children }) {
            return <td className="p-2 border-r border-gray-200/40 dark:border-gray-700/20 last:border-0">{children}</td>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
