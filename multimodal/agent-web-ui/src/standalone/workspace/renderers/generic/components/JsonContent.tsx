import React from 'react';

interface JsonContentProps {
  data: any;
}

export const JsonContent: React.FC<JsonContentProps> = ({ data }) => {
  const formattedJson = JSON.stringify(data, null, 2);

  return (
    <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-3 rounded font-mono overflow-auto">
      {formattedJson}
    </pre>
  );
};
