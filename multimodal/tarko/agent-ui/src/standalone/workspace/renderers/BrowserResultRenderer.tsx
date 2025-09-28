import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FiMonitor } from 'react-icons/fi';
import { MarkdownRenderer, BrowserShell } from '@tarko/ui';

import { FileDisplayMode } from '../types';

interface BrowserResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Renders browser navigation and page content results with improved UI
 */
export const BrowserResultRenderer: React.FC<BrowserResultRendererProps> = ({ panelContent }) => {

  // Extract browser result data from panelContent
  const browserData = extractBrowserResultData(panelContent);

  if (!browserData) {
    return <div className="text-gray-500 italic">Browser result is empty</div>;
  }

  const { url, content, title, contentType, screenshot } = browserData;
  const displayTitle = title || url?.split('/').pop() || 'Browser Result';



  // Extract URL from text content if it's in the format "Navigated to URL"
  const extractUrlFromContent = () => {
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const lines = content.split('\n');
      const firstLine = lines[0] || '';
      return firstLine.replace('Navigated to ', '').trim();
    }
    return url || '';
  };

  // Extract content from text after URL line
  const extractContentFromText = () => {
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const lines = content.split('\n');
      return lines.slice(1).join('\n');
    }
    return content;
  };

  const extractedUrl = extractUrlFromContent();
  const extractedContent = extractContentFromText();

  return (
    <div className="space-y-4">
      <div className="mb-4">


        {/* Content with enhanced browser shell */}
        <BrowserShell title={displayTitle} url={extractedUrl}>
          <div className="bg-white dark:bg-gray-800 px-5 min-h-[200px] max-h-[70vh] overflow-auto border-t border-gray-100/30 dark:border-gray-700/20">
            {screenshot && (
              <div className="py-4">
                <img
                  src={screenshot}
                  alt="Browser Screenshot"
                  className="w-full h-auto rounded-md"
                />
              </div>
            )}

            {(contentType === 'text' || typeof extractedContent === 'string') &&
            extractedContent ? (
              <div className="prose dark:prose-invert prose-sm max-w-none py-4">
                <MarkdownRenderer
                  content={typeof extractedContent === 'string' ? extractedContent : ''}
                />
              </div>
            ) : (
              !screenshot && (
                <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100/30 dark:border-gray-700/20 overflow-x-auto">
                  {JSON.stringify(extractedContent, null, 2)}
                </pre>
              )
            )}
          </div>
        </BrowserShell>
      </div>
    </div>
  );
};

function extractBrowserResultData(panelContent: StandardPanelContent): {
  url?: string;
  content?: string;
  title?: string;
  contentType?: string;
  screenshot?: string;
} | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { url, content, title, contentType } = panelContent.arguments;

      return {
        url: url ? String(url) : undefined,
        content: content ? String(content) : undefined,
        title: title ? String(title) : undefined,
        contentType: contentType ? String(contentType) : undefined,
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { url, content, title, contentType } = sourceObj;

      return {
        url: url ? String(url) : undefined,
        content: content ? String(content) : undefined,
        title: title ? String(title) : undefined,
        contentType: contentType ? String(contentType) : undefined,
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }

    // If source is a string, treat it as content
    if (typeof panelContent.source === 'string') {
      return {
        content: panelContent.source,
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract browser result data:', error);
    return null;
  }
}
