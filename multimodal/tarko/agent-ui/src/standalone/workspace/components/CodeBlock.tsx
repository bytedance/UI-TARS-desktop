import React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  showLineNumbers = false,
  className = '',
}) => {
  const lines = code.split('\n');

  return (
    <div className={`font-mono text-sm bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="overflow-auto h-full">
        <div className="min-h-full">
          {lines.map((line, index) => (
            <div
              key={index}
              className="flex hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[1.25rem] leading-5"
            >
              {showLineNumbers && (
                <div className="flex-shrink-0 w-12 px-2 text-right text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 select-none">
                  {index + 1}
                </div>
              )}
              <div className="flex-1 px-4 py-0 whitespace-pre-wrap break-all">
                <code className="text-gray-800 dark:text-gray-200">
                  {line || ' '} {/* Ensure empty lines have height */}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
