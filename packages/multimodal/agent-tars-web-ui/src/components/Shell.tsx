import React from 'react';

interface ShellProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children, title, headerActions }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden">
      {(title || headerActions) && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          {title && <h2 className="font-medium">{title}</h2>}
          {headerActions}
        </div>
      )}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};
