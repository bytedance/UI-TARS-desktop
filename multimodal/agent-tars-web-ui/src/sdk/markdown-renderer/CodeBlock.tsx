import React, { useState, useRef } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi'; // 导入 react-icons 图标

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // If no language is specified, return inline code style
  if (!match) {
    return (
      <code className="font-mono text-xs bg-gray-50 text-gray-800 px-2 py-0.5 rounded-md mx-0.5 whitespace-nowrap font-medium">
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
    <div className="relative my-6 group">
      {/* Language badge and action buttons - positioned in top right, visible on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Action buttons */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-md shadow-sm p-1">
          {/* Language badge */}
          <div className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-mono">
            {match[1] || 'code'}
          </div>

          {/* Word wrap toggle button */}
          <button
            onClick={toggleWordWrap}
            className="hover:bg-gray-100 transition-colors rounded-md px-2 py-1 text-xs text-gray-600 hover:text-gray-700"
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
            className="hover:bg-gray-100 transition-colors rounded-md px-2 py-1 text-gray-600 hover:text-gray-700"
            title="Copy code"
          >
            {isCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          </button>
        </div>
      </div>

      <pre
        className={`bg-white backdrop-blur-sm rounded-lg p-2 text-xs ${
          isWordWrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'
        }`}
      >
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
};
