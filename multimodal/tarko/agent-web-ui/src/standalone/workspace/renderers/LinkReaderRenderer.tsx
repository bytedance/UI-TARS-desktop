import React, { useState } from 'react';
import { FiExternalLink, FiCopy, FiCheck, FiLink } from 'react-icons/fi';
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
 * Simplified renderer for LinkReader tool results
 * Shows raw content by default with minimal UI
 */
export const LinkReaderRenderer: React.FC<LinkReaderRendererProps> = ({ part, onAction }) => {
  const [copiedStates, setCopiedStates] = useState<Set<number>>(new Set());

  // Extract LinkReader data directly from the part
  const linkData = extractLinkReaderData(part);

  if (!linkData || !linkData.results || linkData.results.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400 text-sm italic">
        No link content available
      </div>
    );
  }

  const copyContent = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates((prev) => new Set([...prev, index]));
      setTimeout(() => {
        setCopiedStates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Simple header */}
      <div className="flex items-center gap-2">
        <FiLink className="text-blue-600 dark:text-blue-400" size={18} />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Link Content</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({linkData.results.length} {linkData.results.length === 1 ? 'result' : 'results'})
        </span>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {linkData.results.map((result, index) => {
          const isCopied = copiedStates.has(index);

          return (
            <div
              key={`result-${index}`} // secretlint-disable-line
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800/50"
            >
              {/* Result header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-2">
                      {result.title}
                    </h4>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors group"
                    >
                      <FiExternalLink size={14} className="flex-shrink-0" />
                      <span className="truncate group-hover:underline">
                        {formatUrl(result.url)}
                      </span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyContent(result.content, index)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
              </div>

              {/* Raw content */}
              <div className="p-4">
                <div className="max-h-96 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                    {result.content}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Extract LinkReader data from tool result part
 * This function handles the raw data format independently
 */
function extractLinkReaderData(part: ToolResultContentPart): {
  results: LinkResult[];
} | null {
  try {
    let parsedData: LinkReaderResponse;

    // Handle different data formats
    // FIXME: handle mcp tool return both `content` and `structuredContent`
    if (typeof part.data === 'object' && part.data.content && part.data.structuredContent) {
      parsedData = part.data.structuredContent;
    } else if (
      Array.isArray(part.data) &&
      part.data[0] &&
      typeof part.data[0] === 'object' &&
      'text' in part.data[0]
    ) {
      // MCP format with text content
      parsedData = JSON.parse(part.data[0].text as string);
    } else if (typeof part.text === 'string') {
      // Direct text format
      parsedData = JSON.parse(part.text);
    } else if (typeof part.data === 'object' && part.data !== null) {
      // Direct object format
      parsedData = part.data as LinkReaderResponse;
    } else {
      return null;
    }

    // Validate the parsed data
    if (!parsedData || !Array.isArray(parsedData.results)) {
      return null;
    }

    // Transform to our internal format
    const results: LinkResult[] = parsedData.results.map((item) => {
      let hostname: string;
      try {
        const url = new URL(item.url);
        hostname = url.hostname;
      } catch {
        hostname = item.url;
      }

      const extractedTitle = extractTitleFromContent(item.raw_content);
      const fallbackTitle = hostname.replace(/^www\./, ''); // Remove www prefix

      return {
        url: item.url,
        title: extractedTitle || fallbackTitle,
        content: item.raw_content, // Use raw content directly
      };
    });

    return { results };
  } catch (error) {
    console.warn('Failed to extract LinkReader data:', error);
    return null;
  }
}

/**
 * Extract title from content using various patterns with better heuristics
 */
function extractTitleFromContent(content: string): string | null {
  const titlePatterns = [
    // HTML title tag (highest priority)
    /<title[^>]*>([^<]+)<\/title>/i,
    // HTML h1 tag
    /<h1[^>]*>([^<]+)<\/h1>/i,
    // Markdown h1
    /^#\s+(.+)$/m,
    // Underlined title
    /^(.+)\n[=]{3,}$/m,
    // Bold title at start
    /^\*\*(.+)\*\*$/m,
  ];

  for (const pattern of titlePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      // Filter out obviously bad titles
      if (!isBadTitle(title)) {
        return title;
      }
    }
  }

  // Fallback: use first meaningful line
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (const line of lines.slice(0, 5)) {
    // Check first 5 non-empty lines
    if (line.length > 10 && line.length <= 100 && !isBadTitle(line)) {
      return line;
    }
  }

  return null;
}

/**
 * Check if a title candidate is likely to be a bad title
 */
function isBadTitle(title: string): boolean {
  const badPatterns = [
    /^https?:\/\//i, // URLs
    /^\w+\s*[:：]\s*\w+/i, // Key-value pairs like "Content-Type: text/html"
    /blob:|localhost|127\.0\.0\.1/i, // Technical URLs
    /^[\w\s]*\.(com|cn|org|net)/i, // Domain names
    /^\d+$/, // Just numbers
    /^[^\w\s]+$/, // Just symbols
    /^.{1,3}$/, // Too short
    /导航|跳过|skip|navigation/i, // Navigation text
  ];

  return badPatterns.some((pattern) => pattern.test(title));
}

/**
 * Format URL for display - show hostname and path nicely
 */
function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname;

    if (path === '/' || path === '') {
      return hostname;
    }

    // Show hostname + shortened path
    if (path.length > 30) {
      return `${hostname}${path.substring(0, 25)}...`;
    }

    return `${hostname}${path}`;
  } catch {
    return url;
  }
}
