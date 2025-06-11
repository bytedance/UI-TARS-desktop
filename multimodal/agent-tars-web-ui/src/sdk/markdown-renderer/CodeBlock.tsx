import React, { useState, useRef } from 'react';

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
      <code className="font-mono text-xs bg-gray-50 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200 mx-0.5 whitespace-nowrap font-medium">
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
      {/* Code block header with actions */}

      <div className="flex items-center justify-between bg-gray-50 rounded-t-lg border-t border-l border-r border-gray-200 px-4 py-2">
        {/* Language badge */}

        <div className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-mono">
          {match[1] || 'code'}
        </div>

        {/* Action buttons - hidden until hover */}
        <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
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

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="hover:bg-gray-100 transition-colors rounded-md px-2 py-1 text-xs text-gray-600 hover:text-gray-700 flex items-center gap-1"
            title="Copy code"
          >
            {isCopied ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre
        className={`bg-gray-50 backdrop-blur-sm border-b border-l border-r border-gray-200 rounded-b-lg p-4 font-mono text-sm ${
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
