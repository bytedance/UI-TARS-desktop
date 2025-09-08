/**
 * Utility functions for code-related operations
 */

/**
 * Get language for syntax highlighting based on file extension
 */
export const getLanguageFromExtension = (extension: string): string => {
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    xml: 'xml',
    sh: 'bash',
    bash: 'bash',
  };

  return langMap[extension] || 'text';
};

/**
 * Format file size in bytes to human-readable format
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
