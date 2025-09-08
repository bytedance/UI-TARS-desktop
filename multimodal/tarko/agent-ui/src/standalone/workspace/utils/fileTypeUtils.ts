/**
 * Utility functions for file type detection and handling
 */

export interface FileTypeInfo {
  isHtml: boolean;
  isMarkdown: boolean;
  isRenderableFile: boolean;
  extension: string;
  fileName: string;
}

/**
 * Get comprehensive file type information from a file path
 */
export function getFileTypeInfo(filePath: string): FileTypeInfo {
  const fileName = filePath.split('/').pop() || filePath;
  const extension = fileName.toLowerCase().split('.').pop() || '';
  
  const isHtml = extension === 'html' || extension === 'htm';
  const isMarkdown = extension === 'md' || extension === 'markdown';
  const isRenderableFile = isHtml || isMarkdown;

  return {
    isHtml,
    isMarkdown,
    isRenderableFile,
    extension,
    fileName,
  };
}

/**
 * Check if a file is renderable (HTML or Markdown)
 */
export function isRenderableFile(filePath: string): boolean {
  return getFileTypeInfo(filePath).isRenderableFile;
}

/**
 * Check if a file is HTML
 */
export function isHtmlFile(filePath: string): boolean {
  return getFileTypeInfo(filePath).isHtml;
}

/**
 * Check if a file is Markdown
 */
export function isMarkdownFile(filePath: string): boolean {
  return getFileTypeInfo(filePath).isMarkdown;
}

/**
 * Get the appropriate default display mode for a file during streaming
 */
export function getDefaultDisplayMode(filePath: string, isStreaming: boolean): 'source' | 'rendered' {
  const { isHtml } = getFileTypeInfo(filePath);
  
  // For HTML files during streaming, default to source mode
  if (isHtml && isStreaming) {
    return 'source';
  }
  
  return 'rendered';
}
