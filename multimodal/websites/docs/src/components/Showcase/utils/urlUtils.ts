/**
 * Ensure URL has HTTPS prefix
 */
export function ensureHttps(url: string): string {
  if (!url) return url;
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  }
  
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  
  return `https://${url}`;
}

/**
 * Extract ID from path and determine type based on content
 * slug contains '-', sessionId doesn't contain '-'
 */
export function extractIdFromPath(pathname: string): { type: 'slug' | 'sessionId'; value: string } | null {
  const showcaseMatch = pathname.match(/^\/showcase\/(.+)$/);
  if (showcaseMatch) {
    const value = decodeURIComponent(showcaseMatch[1]);
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
