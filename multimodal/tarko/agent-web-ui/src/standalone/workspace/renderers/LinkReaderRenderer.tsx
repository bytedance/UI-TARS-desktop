import React, { useState } from 'react';
import { FiExternalLink, FiCopy, FiCheck, FiFileText, FiCode } from 'react-icons/fi';
import { ToolResultContentPart } from '../types';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { wrapMarkdown } from '@/common/utils/markdown';

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
  const [showMarkdownSource, setShowMarkdownSource] = useState(false);

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
    <div className="space-y-4">
      {linkData.results.map((result, index) => {
        const isCopied = copiedIndex === index;

        return (
          <div
            key={`link-${index}`} // secretlint-disable-line
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            {/* Header with better contrast */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title with document icon */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <FiFileText size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1">
                        {result.title}
                      </h3>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <span className="truncate">{formatUrl(result.url)}</span>
                        <FiExternalLink size={12} className="flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Control buttons */}
                <div className="flex items-center gap-1">
                  {/* View mode toggle */}
                  <button
                    onClick={() => setShowMarkdownSource(!showMarkdownSource)}
                    className={`p-2 rounded-md transition-colors ${
                      showMarkdownSource
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={showMarkdownSource ? 'Show rendered content' : 'Show markdown source'}
                  >
                    {showMarkdownSource ? <FiFileText size={14} /> : <FiCode size={14} />}
                  </button>

                  {/* Copy button */}
                  <button
                    onClick={() => copyContent(result.content, index)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title="Copy content"
                  >
                    {isCopied ? (
                      <FiCheck size={14} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <FiCopy size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Content area with better contrast */}
            <div className="p-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                <div className="p-3">
                  {showMarkdownSource ? (
                    <MarkdownRenderer content={wrapMarkdown(result.content)} />
                  ) : (
                    <MarkdownRenderer content={result.content} />
                  )}
                </div>
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
