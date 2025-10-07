import React from 'react';

interface JsonRendererProps {
  data: any;
  className?: string;
}

export const JsonRenderer: React.FC<JsonRendererProps> = ({ data, className = '' }) => {
  return (
    <pre className={`overflow-auto p-3 rounded bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-mono text-xs ${className}`}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};