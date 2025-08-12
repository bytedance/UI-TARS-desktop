import React, { useState } from 'react';
import { FiExternalLink, FiCopy, FiCheck } from 'react-icons/fi';
import { ToolResultContentPart } from '../types';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';

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
    <div className="space-y-6">
      {linkData.results.map((result, index) => {
        const isCopied = copiedIndex === index;

        return (
          <div
            key={`link-${index}`} // secretlint-disable-line
            className="group relative bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800/90 dark:to-gray-900/80 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-300 overflow-hidden backdrop-blur-sm"
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-purple-500/3 dark:from-blue-400/5 dark:to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Header with enhanced design */}
            <div className="relative p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Enhanced title with icon */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FiExternalLink size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {result.title}
                      </h3>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/link"
                      >
                        <span className="truncate">{formatUrl(result.url)}</span>
                        <FiExternalLink
                          size={12}
                          className="flex-shrink-0 opacity-60 group-hover/link:opacity-100 transition-opacity"
                        />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Enhanced copy button */}
                <button
                  onClick={() => copyContent(result.content, index)}
                  className="flex-shrink-0 p-3 text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 group/copy"
                  title="Copy content"
                >
                  {isCopied ? (
                    <FiCheck size={16} className="text-green-500 group-hover/copy:text-white" />
                  ) : (
                    <FiCopy size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Enhanced content area */}
            <div className="relative px-6 pb-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner overflow-hidden">
                <div className="p-5">
                  <MarkdownRenderer content={result.content} />
                </div>
              </div>
            </div>

            {/* Subtle bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
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
