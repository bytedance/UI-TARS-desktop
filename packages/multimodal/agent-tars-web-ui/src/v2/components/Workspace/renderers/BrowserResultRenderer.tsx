import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { FiMonitor, FiExternalLink } from 'react-icons/fi';
import { Markdown } from '../../Common/Markdown';

interface BrowserResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders browser navigation and page content results
 */
export const BrowserResultRenderer: React.FC<BrowserResultRendererProps> = ({ part }) => {
  const { url, content, title } = part;

  if (!url && !content) {
    return <div className="text-gray-500 italic">Browser result is empty</div>;
  }

  return (
    <div className="space-y-4">
      {url && (
        <div className="mb-4">
          <div className="flex items-center mb-3">
            <FiMonitor className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
              {title || 'Browser Navigation'}
            </h3>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl text-sm mb-6 border border-gray-100/50 dark:border-gray-700/20">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-600 dark:text-accent-400 hover:underline flex items-center"
            >
              {url}
              <FiExternalLink className="ml-1.5" size={14} />
            </a>
          </div>
        </div>
      )}

      {content && (
        <div>
          <div className="border border-gray-100/40 dark:border-gray-700/40 rounded-xl p-4 max-h-[70vh] overflow-auto bg-white dark:bg-gray-800 shadow-sm">
            {typeof content === 'string' ? (
              <Markdown>{content}</Markdown>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {JSON.stringify(content, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
