import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
            <SyntaxHighlighter style={tomorrow} language={match[1]} PreTag="div" {...props}>
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code
              className={`${className} bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm`}
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
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {children}
            </a>
          );
        },
        ul({ children }) {
          return <ul className="list-disc pl-5 mb-4 last:mb-0">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 mb-4 last:mb-0">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-1 last:mb-0">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-md font-bold mb-2">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 italic text-gray-600 dark:text-gray-400 mb-4">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
