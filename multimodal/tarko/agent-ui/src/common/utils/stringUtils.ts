/**
 * Common string utility functions to reduce duplication
 */

/**
 * Check if a string represents an image file
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.webp',
    '.bmp',
    '.tiff',
    '.ico',
  ];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
}

/**
 * Check if a string represents an HTML file
 */
export function isHtmlFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm');
}

/**
 * Check if a string represents a Markdown file
 */
export function isMarkdownFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.md') || filename.toLowerCase().endsWith('.markdown');
}

/**
 * Check if a string is a URL (starts with http/https)
 */
export function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Check if a string is a secure URL (starts with https)
 */
export function isSecureUrl(str: string): boolean {
  return str.startsWith('https://');
}

/**
 * Check if a string is a data URL
 */
export function isDataUrl(str: string): boolean {
  return str.startsWith('data:');
}

/**
 * Check if a string represents a screenshot or browser-related image
 */
export function isScreenshotImage(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes('screenshot') || lowerName.includes('browser');
}

/**
 * Check if a tool name is file-related
 */
export function isFileRelatedTool(toolName: string): boolean {
  const fileToolPrefixes = ['run_', 'list_', 'read_', 'write_', 'edit_'];
  return fileToolPrefixes.some((prefix) => toolName.startsWith(prefix)) || toolName === 'edit_file';
}

/**
 * Check if a tool call ID represents a final answer/research report
 */
export function isFinalAnswerTool(toolCallId: string): boolean {
  return toolCallId.startsWith('final-answer');
}

/**
 * Check if content indicates browser navigation
 */
export function isBrowserNavigation(text: string): boolean {
  return text.startsWith('Navigated to');
}

/**
 * Check if a file type should be treated as code
 */
export function isCodeFile(extension: string): boolean {
  const codeExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'java',
    'c',
    'cpp',
    'cs',
    'php',
    'rb',
    'go',
    'rs',
    'swift',
    'kt',
    'scala',
    'sh',
    'bash',
    'ps1',
    'sql',
    'css',
    'scss',
    'less',
    'json',
    'xml',
    'yaml',
    'yml',
    'toml',
    'ini',
    'cfg',
    'conf',
  ];
  return codeExtensions.includes(extension.toLowerCase());
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() || '';
}

/**
 * Extract filename from path
 */
export function getFilenameFromPath(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Extract domain from URL
 */
export function getDomainFromUrl(url: string): string | null {
  try {
    if (isUrl(url)) {
      return new URL(url).hostname;
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
}
