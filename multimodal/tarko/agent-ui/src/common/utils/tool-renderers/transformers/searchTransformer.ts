import { ToolResultTransformer, SearchData, SearchResultItem, RendererType } from '../types';

/**
 * Transforms search-related tool results to standardized search data
 */
export const searchTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  // Only transform if this is actually a search tool or has search-like content
  if (!isSearchTool(toolName) && !hasSearchContent(content)) {
    return null as any;
  }
  
  let query = '';
  let results: SearchResultItem[] = [];
  
  // Extract query from arguments
  if (args && typeof args === 'object' && 'query' in args && typeof args.query === 'string') {
    query = args.query;
  }
  
  // Extract results from content
  if (Array.isArray(content)) {
    // Look for QUERY and RESULTS markers
    for (const item of content) {
      if (item && typeof item === 'object' && item.type === 'text') {
        if (item.name === 'QUERY' && !query) {
          query = item.text || '';
        } else if (item.name === 'RESULTS') {
          results = parseSearchResults(item.text || '');
        }
      }
    }
    
    // Fallback: treat as search results if no explicit markers
    if (results.length === 0) {
      const textContent = content
        .filter(item => item && typeof item === 'object' && item.type === 'text')
        .map(item => item.text)
        .join('');
      results = parseSearchResults(textContent);
    }
  } else if (typeof content === 'string') {
    results = parseSearchResults(content);
  } else if (typeof content === 'object' && content) {
    // Handle structured search results
    if ('results' in content && Array.isArray(content.results)) {
      results = content.results.map(normalizeSearchResult);
    }
    if ('query' in content && typeof content.query === 'string' && !query) {
      query = content.query;
    }
  }
  
  const searchData: SearchData = {
    type: 'search',
    query,
    results,
  };
  
  return {
    type: 'search_result' as RendererType,
    data: searchData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || `Search: ${query || 'Results'}`,
      ...metadata,
    },
  };
};

/**
 * Check if tool name indicates a search tool
 */
function isSearchTool(toolName: string): boolean {
  const searchTools = ['web_search', 'Search', 'search'];
  return searchTools.includes(toolName);
}

/**
 * Check if content looks like search results
 */
function hasSearchContent(content: unknown): boolean {
  if (Array.isArray(content)) {
    return content.some(item => 
      item && 
      typeof item === 'object' && 
      item.type === 'text' && 
      (item.name === 'RESULTS' || item.name === 'QUERY')
    );
  }
  
  if (typeof content === 'object' && content) {
    return 'results' in content || 'query' in content;
  }
  
  if (typeof content === 'string') {
    // Simple heuristic: contains URL patterns
    return /https?:\/\/[^\s]+/.test(content);
  }
  
  return false;
}

/**
 * Parse search results from text content
 */
function parseSearchResults(text: string): SearchResultItem[] {
  const results: SearchResultItem[] = [];
  
  // Try to parse JSON first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeSearchResult);
    }
    if (parsed && typeof parsed === 'object' && 'results' in parsed && Array.isArray(parsed.results)) {
      return parsed.results.map(normalizeSearchResult);
    }
  } catch {
    // Not JSON, continue with text parsing
  }
  
  // Parse structured text format
  const lines = text.split('\n');
  let currentResult: Partial<SearchResultItem> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Look for title patterns
    if (trimmed.startsWith('Title:') || trimmed.startsWith('# ')) {
      if (currentResult.title) {
        results.push(normalizeSearchResult(currentResult));
        currentResult = {};
      }
      currentResult.title = trimmed.replace(/^(Title:|#)\s*/, '');
    }
    // Look for URL patterns
    else if (trimmed.startsWith('URL:') || trimmed.startsWith('Link:') || /^https?:\/\//.test(trimmed)) {
      currentResult.url = trimmed.replace(/^(URL:|Link:)\s*/, '');
    }
    // Look for snippet/content patterns
    else if (trimmed.startsWith('Snippet:') || trimmed.startsWith('Content:')) {
      currentResult.snippet = trimmed.replace(/^(Snippet:|Content:)\s*/, '');
    }
    // Accumulate content if we have a title
    else if (currentResult.title && !currentResult.snippet) {
      currentResult.snippet = trimmed;
    }
  }
  
  // Add the last result
  if (currentResult.title) {
    results.push(normalizeSearchResult(currentResult));
  }
  
  return results;
}

/**
 * Normalize a search result to the expected format
 */
function normalizeSearchResult(result: any): SearchResultItem {
  return {
    title: result.title || result.name || 'Untitled',
    url: result.url || result.link || result.href || '',
    snippet: result.snippet || result.content || result.description || '',
    content: result.content || result.snippet || '',
  };
}
