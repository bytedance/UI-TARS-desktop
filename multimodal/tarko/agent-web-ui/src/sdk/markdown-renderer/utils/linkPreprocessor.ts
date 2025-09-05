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
 * 2. Not preceded by < or ` (to avoid processing HTML links or code blocks)
 * 3. Not preceded by [ (to avoid creating nested brackets)
 * 4. Not already wrapped in markdown link syntax
 * 5. Followed by Chinese characters or other non-URL characters
 * 6. Excludes trailing punctuation that shouldn't be part of URLs
 * 
 * Updated to handle more edge cases and avoid false positives
 */
const URL_REGEX =
  /(?<!\]\(|<|`|\[)\b(https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\)\]<>`]+?)(?:[.,;:!?](?=[\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef])|(?=[\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\)\]])|$)/g;

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
  
  // Split content by code blocks to avoid processing URLs inside them
  const codeBlockRegex = /```[\s\S]*?```|`[^`]*`/g;
  const parts: Array<{ text: string; isCodeBlock: boolean }> = [];
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), isCodeBlock: false });
    }
    // Add code block
    parts.push({ text: match[0], isCodeBlock: true });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), isCodeBlock: false });
  }
  
  // Process only non-code-block parts
  return parts
    .map(part => 
      part.isCodeBlock ? part.text : part.text.replace(URL_REGEX, '[$1]($1)')
    )
    .join('');
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
