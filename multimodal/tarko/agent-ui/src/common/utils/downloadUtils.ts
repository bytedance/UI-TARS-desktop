/**
 * Utility functions for file downloads
 */

/**
 * Download content as a file
 * @param content - Content to download
 * @param filename - Name of the file
 * @param mimeType - MIME type of the content
 */
export function downloadContent(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

/**
 * Download file from URL (for images, etc.)
 * @param url - URL to download from
 * @param filename - Name of the file
 */
export function downloadFromUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w\s.-]/g, '').trim();
}
