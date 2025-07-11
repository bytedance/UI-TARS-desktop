import React from 'react';

interface SimpleBrowserProps {
  url: string;
  title?: string;
  children: React.ReactNode;
  loading?: boolean;
}

export function SimpleBrowser({
  url,
  title,
  children,
  loading = false,
}: SimpleBrowserProps) {
  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-900/95 backdrop-blur-sm shadow-gray-900/30">
      {/* Simple header */}
      <div className="bg-gray-800/90 px-4 py-2 border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 bg-red-500/70 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500/70 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500/70 rounded-full"></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-sm text-gray-300 font-mono">
              {title || 'Content'}
            </span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-gray-900/95 bg-opacity-95 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
