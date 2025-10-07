import React from 'react';

interface JsonRendererProps {
  data: unknown;
  className?: string;
}

export const JsonRenderer: React.FC<JsonRendererProps> = ({ data, className = '' }) => {
  return (
    <pre
      className={`overflow-auto rounded bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-300 font-mono text-xs border dark:border-gray-800 ${className}`}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};
