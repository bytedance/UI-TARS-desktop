import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { FiMonitor, FiExternalLink } from 'react-icons/fi';
import { Markdown } from '../../Common/Markdown';
import { BrowserShell } from './BrowserShell';

interface BrowserResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders browser navigation and page content results
 * 
 * Design improvements:
 * - Uses BrowserShell for consistent browser styling
 * - Better visual hierarchy and spacing
 * - Clear distinction between URL and content sections
 */
export const BrowserResultRenderer: React.FC<BrowserResultRendererProps> = ({ part }) => {
  const { url, content, title } = part;
  const displayTitle = title || url?.split('/').pop() || 'Browser Result';

  if (!url && !content) {
    return <div className="text-gray-500 italic">Browser result is empty</div>;
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center mb-3">
          <FiMonitor className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
          <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
            {title || 'Browser Navigation'}
          </h3>
        </div>

        <BrowserShell title={displayTitle}>
          {url && (
            <div className="mb-3 p-2 bg-gray-50/80 dark:bg-gray-800/80 rounded-md text-sm border border-gray-100/30 dark:border-gray-700/20">
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
          )}

          {content && (
            <div className="bg-white dark:bg-gray-700/30 rounded-md p-3 max-h-[70vh] overflow-auto border border-gray-100/30 dark:border-gray-700/20">
              {typeof content === 'string' ? (
                <Markdown>{content}</Markdown>
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {JSON.stringify(content, null, 2)}
                </pre>
              )}
            </div>
          )}
        </BrowserShell>
      </div>
    </div>
  );
};
