import React, { useState } from 'react';
import { FiExternalLink, FiCopy, FiCheck } from 'react-icons/fi';
import { ToolResultContentPart } from '../types';

interface LinkReaderRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: unknown) => void;
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
 * Clean and minimal LinkReader renderer
 * Focus on content with simple, elegant design
 */
export const LinkReaderRenderer: React.FC<LinkReaderRendererProps> = ({ part }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const linkData = extractLinkReaderData(part);

  if (!linkData?.results?.length) {
    return <div className="text-gray-500 dark:text-gray-400 text-sm p-3">No content available</div>;
  }

  const copyContent = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="space-y-3">
      {linkData.results.map((result, index) => {
        const isCopied = copiedIndex === index;

        return (
          <div
            key={`link-${index}`} // secretlint-disable-line
            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/30 overflow-hidden hover:shadow-sm transition-shadow"
          >
            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 leading-snug">
                    {result.title}
                  </h3>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FiExternalLink size={12} />
                    {formatUrl(result.url)}
                  </a>
                </div>

                <button
                  onClick={() => copyContent(result.content, index)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy content"
                >
                  {isCopied ? (
                    <FiCheck size={14} className="text-green-500" />
                  ) : (
                    <FiCopy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Content - Always show full content */}
            <div className="px-4 pb-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 text-sm">
                <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {result.content}
                </pre>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Extract LinkReader data from tool result part
 */
function extractLinkReaderData(part: ToolResultContentPart): {
  results: LinkResult[];
} | null {
  try {
    let parsedData: LinkReaderResponse;

    // Handle different data formats
    if (typeof part.data === 'object' && part.data?.content && part.data?.structuredContent) {
      parsedData = part.data.structuredContent;
    } else if (
      Array.isArray(part.data) &&
      part.data[0] &&
      typeof part.data[0] === 'object' &&
      'text' in part.data[0]
    ) {
      parsedData = JSON.parse(part.data[0].text as string);
    } else if (typeof part.text === 'string') {
      parsedData = JSON.parse(part.text);
    } else if (typeof part.data === 'object' && part.data !== null) {
      parsedData = part.data as LinkReaderResponse;
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
 * Extract title from content using simple patterns
 */
function extractTitleFromContent(content: string): string | null {
  const patterns = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /^#\s+(.+)$/m,
    /^(.+)\n[=]{3,}$/m,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const title = match[1].trim();
      if (isValidTitle(title)) {
        return title;
      }
    }
  }

  // Fallback to first meaningful line
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 3)) {
    if (line.length > 10 && line.length <= 100 && isValidTitle(line)) {
      return line;
    }
  }

  return null;
}

/**
 * Check if title is valid
 */
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

/**
 * Get hostname from URL
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Format URL for display
 */
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
