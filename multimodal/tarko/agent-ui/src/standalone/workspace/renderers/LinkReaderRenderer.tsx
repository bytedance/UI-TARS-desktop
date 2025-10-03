import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { MarkdownContentRenderer } from './MarkdownContentRenderer';
import { FileDisplayMode } from '../types';
import { isOmniTarsTextContentArray, OmniTarsTextContent } from '@/common/services/SearchService';

interface LinkReaderRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

interface LinkResult {
  url: string;
  title: string;
  content: string;
}

interface LinkReaderResult {
  url: string;
  raw_content: string;
  images?: string[];
}

interface LinkReaderResponse {
  results: LinkReaderResult[];
  failed_results?: unknown[];
  response_time?: number;
}

/**
 * LinkReader renderer using the generic MarkdownContentRenderer
 * Converts LinkReader data to the format expected by MarkdownContentRenderer
 */
export const LinkReaderRenderer: React.FC<LinkReaderRendererProps> = ({ 
  panelContent, 
  onAction 
}) => {
  const linkData = extractLinkReaderData(panelContent);

  if (!linkData?.results?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        No content available
      </div>
    );
  }

  // Convert LinkReader results to MarkdownContentRenderer format
  const items = linkData.results.map((result) => ({
    url: result.url,
    title: result.title,
    content: result.content,
  }));

  return <MarkdownContentRenderer items={items} onAction={onAction} />;
};

/**
 * Extract LinkReader data from panelContent
 *
 * @example Version 1
 *
 * {
 *   "type": "link_reader",
 *   "source": {
 *       "content": [
 *           {
 *               "type": "text",
 *               "text": "{ Stringified result of structuredContent }"
 *           }
 *       ],
 *       "structuredContent": {
 *           "results": [
 *               {
 *                   "url": "https://seed-tars.com/1.5",
 *                   "raw_content": " markdown content ",
 *                   "images": []
 *               }
 *           ],
 *           "failed_results": [],
 *           "response_time": 0.01
 *       },
 *       "isError": false
 *   },
 *   "title": "LinkReader",
 *   "timestamp": 1755011267563,
 *   "toolCallId": "call_1755011261618_4nyoiv4z9",
 *   "arguments": {
 *       "description": "Summary this link",
 *       "url": "https://seed-tars.com/1.5"
 *   }
 * }
 *
 *
 * @example Version 2
 * {
 *     "type": "link_reader",
 *     "source": {
 *         "content": [
 *             {
 *                 "type": "text",
 *                 "text": "Page url:https://seed-tars.com/1.5/\nPage Summary:\n• Announcement\nIntr ..."
 *             }
 *         ],
 *         "isError": false
 *     },
 *     "title": "LinkReader",
 *     "timestamp": 1755793542304,
 *     "toolCallId": "call_1755793536036_0vevr8y47",
 *     "arguments": {
 *         "description": "Extract and summarize the content of the webpage at https://seed-tars.com/1.5/",
 *         "url": "https://seed-tars.com/1.5/"
 *     }
 * }
 */
function extractLinkReaderData(panelContent: StandardPanelContent): {
  results: LinkResult[];
} | null {
  try {
    let parsedData: LinkReaderResponse;

    // Handle different data formats
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as {
        content: OmniTarsTextContent[];
        structuredContent?: LinkReaderResponse;
      };

      // Version 1: Check if structuredContent exists directly in source
      if (sourceObj.structuredContent && typeof sourceObj.structuredContent === 'object') {
        parsedData = sourceObj.structuredContent;
      }
      // Version 1: Try content array with JSON text field
      else if (isOmniTarsTextContentArray(sourceObj.content)) {
        const textContent = sourceObj.content[0].text;

        // Version 2: Check if it's a Version 2 format (starts with "Page url:")
        if (textContent.startsWith('Page url:')) {
          const v2Data = parseVersion2Content(textContent, panelContent.arguments?.url);
          if (v2Data) {
            return v2Data;
          }
        }

        // Version 1: Try to parse as JSON
        try {
          parsedData = JSON.parse(textContent);
        } catch {
          return null;
        }
      }
      // Fallback
      else {
        parsedData = {
          results: [],
          failed_results: [],
          response_time: 0,
        };
      }
    } else if (typeof panelContent.source === 'string') {
      try {
        parsedData = JSON.parse(panelContent.source);
      } catch {
        return null;
      }
    } else {
      return null;
    }

    if (!parsedData?.results || !Array.isArray(parsedData.results)) {
      return null;
    }

    const results: LinkResult[] = parsedData.results.map((item) => {
      const title = extractTitleFromContent(item.raw_content) || getHostname(item.url);
      return {
        url: item.url,
        title,
        content: item.raw_content,
      };
    });

    return { results };
  } catch (error) {
    console.warn('Failed to extract LinkReader data:', error);
    return null;
  }
}

/**
 * Parse Version 2 content format
 * Format: "Page url:https://example.com\nPage Summary:\n• content..."
 */
function parseVersion2Content(
  textContent: string,
  argumentsUrl?: string,
): { results: LinkResult[] } | null {
  try {
    const lines = textContent.split('\n');

    // Extract URL from first line
    const urlLine = lines[0];
    const urlMatch = urlLine.match(/^Page url:(.+)$/);
    const url = urlMatch?.[1]?.trim() || argumentsUrl || '';

    if (!url) {
      return null;
    }

    // Extract content after "Page Summary:"
    const summaryIndex = lines.findIndex((line) => line.trim() === 'Page Summary:');
    const content =
      summaryIndex >= 0
        ? lines
            .slice(summaryIndex + 1)
            .join('\n')
            .trim()
        : textContent;

    if (!content) {
      return null;
    }

    // Extract title from content or use hostname
    const title = extractTitleFromContent(content) || getHostname(url);

    return {
      results: [
        {
          url,
          title,
          content,
        },
      ],
    };
  } catch (error) {
    console.warn('Failed to parse Version 2 content:', error);
    return null;
  }
}

function extractTitleFromContent(content: string): string | null {
  // Try structured patterns first
  const patterns = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /^#\s+(.+)$/m,
    /^(.+)\n[=]{3,}$/m,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const cleanedTitle = cleanAndValidateTitle(match[1]);
      if (cleanedTitle) {
        return cleanedTitle;
      }
    }
  }

  // Fallback to first meaningful line

  const meaningfulLines = content
    .split('\n')
    .map((line) => line.trim())

    .filter(Boolean)
    .slice(0, 3)
    .filter((line) => line.length > 10 && line.length <= 100);

  for (const line of meaningfulLines) {
    const cleanedTitle = cleanAndValidateTitle(line);
    if (cleanedTitle) {
      return cleanedTitle;
    }
  }

  return null;
}

function cleanAndValidateTitle(rawTitle: string): string | null {
  const cleaned = rawTitle.trim().replace(/^\[\#\]\([^)]*\)\s*/, '');
  return isValidTitle(cleaned) ? cleaned : null;
}

function isValidTitle(title: string): boolean {
  const badPatterns = [
    /^https?:\/\//i,
    /^\w+\s*[:：]/i,
    /blob:|localhost/i,
    /^\d+$/,
    /^[^\w\s]+$/,
    /^.{1,3}$/,
  ];

  return !badPatterns.some((pattern) => pattern.test(title));
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}


