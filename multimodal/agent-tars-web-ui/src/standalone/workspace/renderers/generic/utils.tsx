import React from 'react';
import {
  FiCheck,
  FiX,
  FiAlertCircle,
  FiInfo,
  FiRefreshCw,
  FiGlobe,
  FiNavigation,
  FiMousePointer,
  FiLayers,
  FiFile,
  FiFileText,
  FiImage,
  FiCode,
  FiDatabase,
} from 'react-icons/fi';
import { AnalyzedResult, ResultType, OperationType } from './types';

/**
 * Determines if a URL points to an image by checking file extension or patterns
 *
 * @param url - The URL to check
 * @returns Boolean indicating if the URL is likely an image
 */
export function isImageUrl(url: string): boolean {
  // Check for common image file extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'];
  const hasImageExtension = imageExtensions.some((ext) => url.toLowerCase().endsWith(ext));

  // Check for image-specific URL patterns
  const imageUrlPatterns = [
    /\/img\//i,
    /\/image\//i,
    /\/afts\/img\//i,
    /\.cdninstagram\.com/i,
    /cloudinary\.com/i,
    /data:image\//i,
  ];
  const matchesImagePattern = imageUrlPatterns.some((pattern) => pattern.test(url));

  // Handle URLs with query parameters that might hide the extension
  const hasImageParam = /[?&](img|image|type=image)/i.test(url);

  return hasImageExtension || matchesImagePattern || hasImageParam;
}

/**
 * Extracts image URLs from mixed content
 *
 * @param content - String that may contain image URLs
 * @returns Object with extracted image URLs and remaining text
 */
export function extractImagesFromContent(content: string): {
  images: string[];
  hasImages: boolean;
  textContent: string;
} {
  // Default result
  const result = {
    images: [],
    hasImages: false,
    textContent: content,
  };

  if (!content || typeof content !== 'string') {
    return result;
  }

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex);

  if (!urls) {
    return result;
  }

  // Filter URLs to only include images
  const imageUrls = urls.filter((url) => isImageUrl(url));

  if (imageUrls.length > 0) {
    // If there's only one URL and it's the entire content, return it as a pure image
    if (imageUrls.length === 1 && content.trim() === imageUrls[0].trim()) {
      return {
        images: imageUrls,
        hasImages: true,
        textContent: '',
      };
    }

    // Otherwise, return both images and text content
    return {
      images: imageUrls,
      hasImages: true,
      textContent: content,
    };
  }

  return result;
}

/**
 * Analyzes tool result content and extracts key information
 *
 * @param content - The raw content from the tool result
 * @param toolName - Optional tool name to help determine operation type
 * @returns Structured analysis of the result
 */
export function analyzeResult(content: any, toolName?: string): AnalyzedResult {
  // Default values
  const result: AnalyzedResult = {
    type: 'info',
    title: 'Operation Result',
    message: null,
    details: {},
  };

  // Try to infer operation type from tool name
  let operation: OperationType = '';
  if (toolName) {
    if (toolName.includes('navigate')) operation = 'navigate';
    else if (toolName.includes('click')) operation = 'click';
    else if (toolName.includes('type')) operation = 'type';
    else if (toolName.includes('scroll')) operation = 'scroll';
    else if (toolName.includes('browser')) operation = 'browser';
  }

  // Handle empty content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return { ...result, type: 'empty', title: 'Empty Result', operation };
  }

  // Handle string content
  if (typeof content === 'string') {
    // Detect if this is a navigation success message
    if (content.includes('Navigated to ')) {
      const url = content.split('\n')[0].replace('Navigated to ', '').trim();
      return {
        ...result,
        type: 'success',
        title: 'Navigation Successful',
        message: null,
        details: { url },
        url,
        operation: 'navigate',
      };
    }
    return { ...result, message: content, operation };
  }

  // Handle object content
  if (typeof content === 'object') {
    // Special handling for navigation-related results
    if (content.url) {
      operation = operation || 'navigate';
      result.url = content.url;
    }

    // Detect status field
    if ('status' in content) {
      const status = String(content.status).toLowerCase();
      if (status === 'success' || status === 'ok' || status === 'completed') {
        result.type = 'success';
        result.title = 'Success';
      } else if (status === 'error' || status === 'fail' || status === 'failed') {
        result.type = 'error';
        result.title = 'Error';
      }
    }

    // Detect message field
    if ('message' in content) {
      result.message = String(content.message);
    } else if ('error' in content) {
      result.message = String(content.error);
      result.type = 'error';
      result.title = 'Error';
    } else if ('msg' in content) {
      result.message = String(content.msg);
    } else if ('content' in content && typeof content.content === 'string') {
      result.message = content.content;
    }

    // Extract title
    if ('title' in content && typeof content.title === 'string' && content.title.trim()) {
      result.title = content.title;
    } else if (result.message && result.message.length < 50) {
      // If message is very short, use it as title
      result.title = result.message;
      result.message = null;
    }

    // Special handling for URL (for browser tool results)
    let url: string | undefined = undefined;
    if ('url' in content && typeof content.url === 'string') {
      url = content.url;
    }

    // Collect other important fields as details
    for (const [key, value] of Object.entries(content)) {
      // Skip already processed fields
      if (['status', 'message', 'error', 'msg', 'title', 'url'].includes(key)) continue;

      // Special handling for pagination info
      if (key === 'pagination' && typeof value === 'object') {
        for (const [pKey, pValue] of Object.entries(value)) {
          result.details[`pagination.${pKey}`] = pValue;
        }
        continue;
      }

      // Prioritize display of important fields
      const importantFields = ['name', 'description', 'type', 'value', 'data'];
      if (importantFields.includes(key)) {
        result.details = { [key]: value, ...result.details };
      } else {
        // Add to details
        result.details[key] = value;
      }
    }

    return { ...result, url, operation };
  }

  return { ...result, operation };
}

/**
 * Gets the appropriate status icon based on result type and operation
 *
 * @param type - The result type
 * @param operation - Optional operation type
 * @returns React component for the status icon
 */
export function getStatusIcon(type: ResultType, operation?: OperationType): React.ReactNode {
  // First check for operation-specific icons
  if (operation) {
    switch (operation) {
      case 'navigate':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-50 dark:bg-accent-900/20 text-accent-500 dark:text-accent-400">
            <FiNavigation size={16} />
          </div>
        );
      case 'click':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-accent-500 dark:text-accent-400">
            <FiMousePointer size={16} />
          </div>
        );
      case 'browser':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
            <FiGlobe size={16} />
          </div>
        );
    }
  }

  // Fall back to status type icons
  switch (type) {
    case 'success':
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400">
          <FiCheck size={16} />
        </div>
      );
    case 'error':
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400">
          <FiX size={16} />
        </div>
      );
    case 'empty':
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
          <FiLayers size={16} />
        </div>
      );
    case 'info':
    default:
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
          <FiInfo size={16} />
        </div>
      );
  }
}

/**
 * Generates a human-readable description based on the operation type
 *
 * @param operation - The operation type
 * @param resultInfo - The analyzed result information
 * @returns Descriptive text for the operation
 */
export function getOperationDescription(
  operation: string,
  resultInfo: { type: ResultType; details: any },
): string {
  switch (operation) {
    case 'navigate':
      return resultInfo.details?.url ? `Navigated to ${resultInfo.details.url}` : 'Page Navigation';
    case 'click':
      return 'Element Click';
    case 'type':
      return 'Text Input';
    case 'scroll':
      return 'Page Scroll';
    case 'browser':
      return 'Browser Operation';
    default:
      return 'Operation Completed';
  }
}

/**
 * Gets CSS classes for the header based on result type
 *
 * @param type - The result type
 * @returns CSS class string
 */
export function getHeaderClasses(type: ResultType): string {
  switch (type) {
    case 'success':
      return 'border-green-100/50 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/20';
    case 'error':
      return 'border-red-100/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/20';
    case 'empty':
      return 'border-gray-100/50 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-800/50';
    case 'info':
    default:
      return 'border-blue-100/50 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/20';
  }
}

/**
 * Formats a key name for better display
 *
 * @param key - The raw key name
 * @returns Formatted key name
 */
export function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .replace(/[._]/g, ' '); // Replace underscores and dots with spaces
}

/**
 * Formats a value for display
 *
 * @param value - The value to format
 * @returns React node representing the formatted value
 */
export function formatValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500 italic">None</span>;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 dark:text-gray-500 italic">Empty array</span>;
    }

    if (
      value.length <= 3 &&
      value.every((item) => typeof item === 'string' || typeof item === 'number')
    ) {
      return value.join(', ');
    }

    return (
      <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === 'object') {
    try {
      return (
        <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    } catch (e) {
      return String(value);
    }
  }

  // Make URLs clickable
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-600 dark:text-accent-400 hover:underline"
      >
        {value}
      </a>
    );
  }

  return String(value);
}

/**
 * Check if content is possibly Markdown
 */
export function isPossibleMarkdown(text: string): boolean {
  // Check for common Markdown syntax patterns
  const markdownPatterns = [
    /^#+\s+.+$/m, // Headers
    /\[.+\]\(.+\)/, // Links
    /\*\*.+\*\*/, // Bold
    /\*.+\*/, // Italic
    /```[\s\S]*```/, // Code blocks
    /^\s*-\s+.+$/m, // Unordered lists
    /^\s*\d+\.\s+.+$/m, // Ordered lists
    />\s+.+/, // Blockquotes
    /!\[.+\]\(.+\)/, // Images
    /^---$/m, // Horizontal rules
    /^\|.+\|$/m, // Tables
    /^\s*\[\d+\].*$/m, // Numbered references like [1], [2]
    /^\s*\[FILE\].*$/m, // File annotations
    /^\s*\[DIR\].*$/m, // Directory annotations
  ];

  // If content matches at least two Markdown patterns, or is lengthy with one pattern, consider it Markdown
  const matchCount = markdownPatterns.filter((pattern) => pattern.test(text)).length;
  return matchCount >= 2 || (text.length > 500 && matchCount >= 1);
}

/**
 * Determines the type of file based on extension
 */
export function determineFileType(extension: string): 'code' | 'document' | 'image' | 'other' {
  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'java',
      'c',
      'cpp',
      'php',
      'html',
      'css',
      'json',
      'xml',
    ].includes(extension)
  ) {
    return 'code';
  }
  if (['md', 'txt', 'docx', 'pdf', 'rtf', 'markdown'].includes(extension)) {
    return 'document';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) {
    return 'image';
  }
  return 'other';
}

/**
 * Get appropriate file icon based on extension
 */
export function getFileIcon(extension: string): React.ReactNode {
  if (['html', 'htm', 'xml'].includes(extension)) {
    return <FiCode size={18} className="text-orange-500 dark:text-orange-400" />;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) {
    return <FiImage size={18} className="text-blue-500 dark:text-blue-400" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'php', 'css'].includes(extension)) {
    return <FiCode size={18} className="text-accent-500 dark:text-accent-400" />;
  }
  if (['json', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf'].includes(extension)) {
    return <FiFileText size={18} className="text-amber-500 dark:text-amber-400" />;
  }
  if (['md', 'markdown'].includes(extension)) {
    return <FiFileText size={18} className="text-emerald-500 dark:text-emerald-400" />;
  }
  if (['csv', 'xlsx', 'xls', 'xml'].includes(extension)) {
    return <FiDatabase size={18} className="text-purple-500 dark:text-purple-400" />;
  }
  return <FiFile size={18} className="text-gray-600 dark:text-gray-400" />;
}
