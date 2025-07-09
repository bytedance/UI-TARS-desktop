/**
 * Make sure the URL has https prefix
 */
export function ensureHttps(url: string): string {
  if (!url) return url;
  
  // 如果已经是完整的 URL（包含协议），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 如果是 http，转换为 https
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  }
  
  // 如果没有协议，添加 https
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  
  // 如果是相对路径或域名，添加 https://
  return `https://${url}`;
}

/**
 * Extract ID from path and determine type based on content
 * slug contains '-', sessionId doesn't contain '-'
 * Only supports /showcase/:id format
 */
export function extractIdFromPath(pathname: string): { type: 'slug' | 'sessionId'; value: string } | null {
  // Only match /showcase/:id format
  const showcaseMatch = pathname.match(/^\/showcase\/(.+)$/);
  if (showcaseMatch) {
    const value = decodeURIComponent(showcaseMatch[1]);
    
    // Determine type based on whether it contains '-'
    const type = value.includes('-') ? 'slug' : 'sessionId';
    
    return {
      type,
      value
    };
  }
  
  return null;
}

/**
 * @deprecated Use extractIdFromPath instead
 */
export function extractSlugFromPath(pathname: string): string | null {
  const result = extractIdFromPath(pathname);
  return result ? result.value : null;

}
