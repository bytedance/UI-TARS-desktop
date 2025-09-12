import React from 'react';

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  preserveWhitespace?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, preserveWhitespace = false }) => {
  const match = /language-(\w+)/.exec(className || '');

  if (inline || !match) {
    return (
      <code className="font-mono text-[#525252] bg-[#1b1f230d] dark:bg-[#333e4ecc] dark:text-gray-200 px-1 py-0.5 mx-0.5 rounded-md">
        {children}
      </code>
    );
  }

  const preClasses = `bg-[#f5f5f5] dark:bg-[#111111] dark:border-gray-700/50 rounded-xl p-4 text-xs overflow-x-auto${preserveWhitespace ? ' whitespace-pre-wrap' : ''}`;

  return (
    <div className="my-2">
      <pre className={preClasses}>
        <code className={`${className} text-gray-800 dark:text-gray-200`}>{children}</code>
      </pre>
    </div>
  );
};
