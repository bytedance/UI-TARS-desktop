import React from 'react';

interface JsonContentProps {
  data: unknown;
}

export const JsonContent: React.FC<JsonContentProps> = ({ data }) => {
  const formattedJson = JSON.stringify(data, null, 2);

  return (
    <div className="w-full max-w-full">
      <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-3 rounded font-mono overflow-x-auto overflow-y-auto max-h-96 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 antialiased">
        {formattedJson}
      </pre>
    </div>
  );
};
