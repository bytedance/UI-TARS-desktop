import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { MarkdownContentRenderer } from './MarkdownContentRenderer';
import { FileDisplayMode } from '../types';
import { isOmniTarsTextContentArray, OmniTarsTextContent } from '@/common/services/SearchService';

interface BrowserGetMarkdownRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

interface BrowserMarkdownResult {
  content: string;
  title?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasMorePages: boolean;
  };
}

/**
 * Renderer for browser_get_markdown tool output
 * Converts browser markdown results to the format expected by MarkdownContentRenderer
 */
export const BrowserGetMarkdownRenderer: React.FC<BrowserGetMarkdownRendererProps> = ({
  panelContent,
  onAction,
}) => {
  const markdownData = extractBrowserMarkdownData(panelContent);

  if (!markdownData) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        No markdown content available
      </div>
    );
  }

  // Convert browser markdown data to MarkdownContentRenderer format
  const items = [
    {
      url: getCurrentPageUrl(panelContent),
      title: markdownData.title || 'Page Content',
      content: markdownData.content,
    },
  ];

  return <MarkdownContentRenderer items={items} onAction={onAction} />;
};

/**
 * Extract browser markdown data from panelContent
 * Handles different response formats from browser_get_markdown tool
 */
function extractBrowserMarkdownData(panelContent: StandardPanelContent): BrowserMarkdownResult | null {
  try {
    let parsedData: BrowserMarkdownResult;

    // Handle different data formats
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as {
        content: OmniTarsTextContent[];
        structuredContent?: BrowserMarkdownResult;
      };

      // Check if structuredContent exists directly in source
      if (sourceObj.structuredContent && typeof sourceObj.structuredContent === 'object') {
        parsedData = sourceObj.structuredContent;
      }
      // Try content array with JSON text field
      else if (isOmniTarsTextContentArray(sourceObj.content)) {
        const textContent = sourceObj.content[0].text;

        try {
          parsedData = JSON.parse(textContent);
        } catch {
          // If JSON parsing fails, treat as plain text content
          parsedData = {
            content: textContent,
            title: 'Page Content',
          };
        }
      }
      // Fallback
      else {
        return null;
      }
    } else if (typeof panelContent.source === 'string') {
      try {
        parsedData = JSON.parse(panelContent.source);
      } catch {
        // If JSON parsing fails, treat as plain text content
        parsedData = {
          content: panelContent.source,
          title: 'Page Content',
        };
      }
    } else {
      return null;
    }

    // Validate that we have content
    if (!parsedData?.content || typeof parsedData.content !== 'string') {
      return null;
    }

    return parsedData;
  } catch (error) {
    console.warn('Failed to extract browser markdown data:', error);
    return null;
  }
}

/**
 * Get current page URL from panel content arguments or fallback
 */
function getCurrentPageUrl(panelContent: StandardPanelContent): string {
  // Try to get URL from arguments
  if (panelContent.arguments?.url && typeof panelContent.arguments.url === 'string') {
    return panelContent.arguments.url;
  }

  // Fallback to a generic browser page indicator
  return 'browser://current-page';
}
