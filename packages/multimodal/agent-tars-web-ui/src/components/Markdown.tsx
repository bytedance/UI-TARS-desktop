import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';

interface MarkdownProps {
  children: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ children }) => {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <motion.div
              initial={{ opacity: 0.9 }}
              whileHover={{ opacity: 1 }}
              className="rounded-lg overflow-hidden my-3"
            >
              <SyntaxHighlighter
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  background: 'rgba(30, 41, 59, 0.95)',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </motion.div>
          ) : (
            <code
              className={`${className} bg-gray-100/80 dark:bg-gray-700/60 px-1.5 py-0.5 rounded text-sm font-mono`}
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
              className="text-primary-600 dark:text-primary-400 hover:underline transition-colors"
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
            <blockquote className="border-l-3 border-gray-300 dark:border-gray-600 pl-4 py-1 italic text-gray-600 dark:text-gray-400 mb-4">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-sm border-collapse">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-gray-100/80 dark:bg-gray-700/60">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody>{children}</tbody>;
        },
        tr({ children }) {
          return (
            <tr className="border-b border-gray-200/50 dark:border-gray-700/30">{children}</tr>
          );
        },
        th({ children }) {
          return <th className="p-2 text-left font-semibold">{children}</th>;
        },
        td({ children }) {
          return <td className="p-2">{children}</td>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
