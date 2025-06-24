import React, { useState, useRef } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  if (inline || !match) {
    return (
      <code className="font-mono text-xs bg-[#fff] border border-slate-200 dark:border-slate-600 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 px-2 py-0.5 mx-0.5 whitespace-nowrap font-medium rounded-md">
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    if (codeRef.current) {
      // Extract text content from code element instead of React nodes
      const code = codeRef.current.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const toggleWordWrap = () => {
    setIsWordWrap(!isWordWrap);
  };

  return (
    <div className="relative my-3 group">
      {/* Language badge and action buttons - positioned in top right, visible on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Action buttons */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-md shadow-sm p-1">
          {/* Language badge */}
          <div className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-mono">
            {match?.[1] ?? 'text'}
          </div>

          {/* Word wrap toggle button */}
          <button
            onClick={toggleWordWrap}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            title={isWordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            {isWordWrap ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h12A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-12z" />
                <path d="M13 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H12v6.5a.5.5 0 0 1-1 0V5.5z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h12A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-12z" />
                <path d="M11 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H12v3.5a.5.5 0 0 1-1 0V5.5z" />
              </svg>
            )}
          </button>

          {/* Copy button - 使用react-icons图标并移除文字 */}
          <button
            onClick={handleCopy}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            title="Copy code"
          >
            {isCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          </button>
        </div>
      </div>

      <pre
        className={`bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 text-xs border border-gray-200/50 dark:border-gray-700/50 ${
          isWordWrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'
        }`}
      >
        <code ref={codeRef} className={`${className} text-gray-800 dark:text-gray-200`}>
          {children}
        </code>
      </pre>
    </div>
  );
};
