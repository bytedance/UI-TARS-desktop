import React, { useState } from 'react';
import { ToolResultContentPart } from '../types';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { BrowserShell } from './BrowserShell';
import { FiCode, FiEye } from 'react-icons/fi';

interface TextRendererProps {
  part: ToolResultContentPart & { showAsRawMarkdown?: boolean };
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders text content with Markdown support
 *
 * Improvements:
 * - Support for displaying raw markdown content
 * - Uses browser shell for browser-related content
 * - Better syntax highlighting for code blocks
 * - Toggle between source and rendered modes for markdown content
 */
export const TextRenderer: React.FC<TextRendererProps> = ({ part, onAction }) => {
  // State to track the current display mode (source or rendered)
  const [displayMode, setDisplayMode] = useState<'source' | 'rendered'>('source');

  if (!part.text) {
    return <div className="text-gray-500 italic">Empty text content</div>;
  }

  // Determine if content is browser-related
  const isBrowserContent = part.name?.toLowerCase().includes('browser') || false;

  // Check if this is a browser_get_markdown result that should display raw markdown by default
  const isMarkdownResult =
    part.showAsRawMarkdown ||
    part.name?.toLowerCase().includes('markdown') ||
    part.name?.toLowerCase().includes('browser_get_markdown');

  // Special handling for browser_navigate - extract URL and clickable elements
  const isBrowserNavigate = part.name?.toLowerCase().includes('browser_navigate');

  if (isBrowserNavigate && part.text.includes('Navigated to ')) {
    const lines = part.text.split('\n');
    const navigationLine = lines[0];
    const url = navigationLine.replace('Navigated to ', '').trim();

    return (
      <BrowserShell title="Browser Navigation" url={url}>
        <div className="px-4 py-5">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Navigated to URL:{' '}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-600 dark:text-accent-400 hover:underline"
            >
              {url}
            </a>
          </div>

          {lines.length > 1 && (
            <div className="mt-4 prose dark:prose-invert prose-sm max-w-none">
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <MarkdownRenderer content={lines.slice(1).join('\n')} />
              </div>
            </div>
          )}
        </div>
      </BrowserShell>
    );
  }

  // Handle "other" type events and markdown content
  const isOtherType = part.name === 'other' || part.type === 'other';
  const hasMarkdown = /[*#\[\]_`~]/.test(part.text);
  const shouldOfferToggle = isMarkdownResult || (hasMarkdown && part.text.length > 100);

  // Render markdown content with toggle between source and rendered modes
  if (isOtherType || isMarkdownResult || hasMarkdown) {
    // Display toggle button for markdown content
    const toggleButton = shouldOfferToggle && (
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setDisplayMode('source')}
            className={`px-3 py-1.5 text-xs font-medium ${
              displayMode === 'source'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            } rounded-l-lg border border-gray-200 dark:border-gray-600`}
          >
            <div className="flex items-center">
              <FiCode className="mr-1.5" size={12} />
              <span>Source</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('rendered')}
            className={`px-3 py-1.5 text-xs font-medium ${
              displayMode === 'rendered'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            } rounded-r-lg border border-gray-200 dark:border-gray-600 border-l-0`}
          >
            <div className="flex items-center">
              <FiEye className="mr-1.5" size={12} />
              <span>Rendered</span>
            </div>
          </button>
        </div>
      </div>
    );

    // If browser content, use browser shell
    if (isBrowserContent) {
      return (
        <BrowserShell title={part.name || 'Browser Content'}>
          {toggleButton}
          <div className="prose dark:prose-invert prose-sm max-w-none">
            {displayMode === 'source' ? (
              <pre className="whitespace-pre-wrap text-sm p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md overflow-x-auto border border-gray-200/50 dark:border-gray-700/30 font-mono">
                {part.text}
              </pre>
            ) : (
              <MarkdownRenderer content={part.text} />
            )}
          </div>
        </BrowserShell>
      );
    }

    // Standard markdown rendering with toggle
    return (
      <div className="prose dark:prose-invert prose-sm max-w-none">
        {toggleButton}
        {displayMode === 'source' ? (
          <pre className="whitespace-pre-wrap text-sm p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md overflow-x-auto border border-gray-200/50 dark:border-gray-700/30 font-mono">
            {part.text}
          </pre>
        ) : (
          <MarkdownRenderer content={part.text} />
        )}
      </div>
    );
  }

  // Render standard content
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      <div className="whitespace-pre-wrap">{part.text}</div>
    </div>
  );
};
