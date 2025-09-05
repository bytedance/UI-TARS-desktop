/**
 * Preprocess markdown content to fix URL parsing issues with Chinese text
 *
 * The issue: react-markdown with remark-gfm incorrectly parses URLs followed by Chinese characters,
 * treating the Chinese text as part of the link text instead of stopping at the URL boundary.
 *
 * Solution: Pre-process the content to wrap bare URLs with proper markdown link syntax.
 */

/**
 * Regular expression to match URLs that are not already in markdown link format
 * Matches http/https URLs that are:
 * 1. Not preceded by ]( (to avoid double-processing existing markdown links)
 * 2. Not already wrapped in markdown link syntax
 * 3. Followed by word boundary, Chinese characters, or other non-URL characters
 * 
 * Updated to be more precise and avoid false positives
 */
const URL_REGEX =
  /(?<!\]\()\b(https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\)\]]+)(?=[\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\)\]]|$)/g;

/**
 * Preprocess markdown content to fix URL parsing issues
 * @param content - Raw markdown content
 * @returns Processed markdown content with properly formatted URLs
 */
export function preprocessMarkdownLinks(content: string): string {
  // Fast path: if no Chinese characters after URLs, no need to process
  if (!hasBareUrlsWithChinese(content)) {
    return content;
  }
  
  // Replace bare URLs with markdown link format [url](url)
  return content.replace(URL_REGEX, '[$1]($1)');
}

/**
 * Fast check for URLs followed by Chinese characters
 * More efficient than full regex replacement for content that doesn't need fixing
 */
function hasBareUrlsWithChinese(content: string): boolean {
  // Quick heuristic: look for http followed by Chinese characters in the same line
  return /https?:\/\/[^\s]*[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(content);
}

/**
 * Check if content contains bare URLs that need preprocessing
 * @param content - Markdown content to check
 * @returns True if content contains bare URLs
 */
export function hasBareUrls(content: string): boolean {
  return URL_REGEX.test(content);
}
