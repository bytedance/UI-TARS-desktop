import React, { useState } from 'react';
import { FiExternalLink, FiCopy, FiCheck, FiGlobe } from 'react-icons/fi';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { wrapMarkdown } from '@/common/utils/markdown';

interface MarkdownContentItem {
  url: string;
  title: string;
  content: string;
}

interface MarkdownContentRendererProps {
  items: MarkdownContentItem[];
  onAction?: (action: string, data: unknown) => void;
}

/**
 * Generic markdown content renderer
 * Clean design with subtle interactions and refined typography
 */
export const MarkdownContentRenderer: React.FC<MarkdownContentRendererProps> = ({ 
  items,
  onAction 
}) => {
  const [copiedStates, setCopiedStates] = useState<boolean[]>([]);

  if (!items?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        No content available
      </div>
    );
  }

  const copyContent = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates((prevStates) => {
        const newStates = [...prevStates];
        newStates[index] = true;
        return newStates;
      });
      setTimeout(() => {
        setCopiedStates((prevStates) => {
          const newStates = [...prevStates];
          newStates[index] = false;
          return newStates;
        });
      }, 1500);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isCopied = copiedStates[index];

        return (
          <div
            key={`content-${index}`}
            className="group relative rounded-xl border border-gray-800 transition-all duration-300 hover:border-gray-700 hover:shadow-lg hover:shadow-gray-900/20"
            style={{ backgroundColor: '#111111' }}
          >
            {/* Floating copy button */}
            <button
              onClick={() => copyContent(item.content, index)}
              className={`absolute top-6 right-6 z-10 p-2 rounded-lg backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                isCopied
                  ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                  : 'bg-gray-800/80 text-gray-400 border border-gray-600/50 hover:bg-gray-700 hover:text-gray-300'
              }`}
              title="Copy content"
            >
              {isCopied ? (
                <FiCheck size={14} className="transition-transform scale-110" />
              ) : (
                <FiCopy size={14} />
              )}
            </button>

            {/* Content container */}
            <div className="p-2">
              {/* Elegant header */}
              <div className="flex items-start gap-3 m-4 mb-0">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-400/20 to-violet-400/20 rounded-lg flex items-center justify-center border border-purple-600/40 shadow-sm">
                  <FiGlobe size={16} className="text-purple-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-100 leading-snug mb-1 line-clamp-2">
                    {item.title}
                  </h3>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-400/80 hover:text-purple-300 transition-colors group/link font-medium"
                  >
                    <span className="truncate max-w-sm">{formatUrl(item.url)}</span>
                    <FiExternalLink
                      size={12}
                      className="flex-shrink-0 opacity-70 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all duration-200"
                    />
                  </a>
                </div>
              </div>

              {/* Content area */}
              <div>
                <MarkdownRenderer 
                  content={wrapMarkdown(item.content)} 
                  forceDarkTheme 
                  codeBlockStyle={{ whiteSpace: 'pre-wrap' }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname;

    if (path === '/' || path === '') {
      return hostname;
    }

    if (path.length > 25) {
      return `${hostname}${path.substring(0, 20)}...`;
    }

    return `${hostname}${path}`;
  } catch {
    return url;
  }
}
