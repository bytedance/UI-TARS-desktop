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
