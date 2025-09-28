import { SearchService } from '@/common/services/SearchService';

/**
 * Helper function to normalize search results using unified search service
 */
export function normalizeSearchResult(toolName: string, content: unknown, args: unknown): unknown {
  // Use unified search service for all search-related processing
  if (SearchService.isSearchTool(toolName)) {
    return SearchService.normalizeSearchContent(toolName, content, args as Record<string, unknown>);
  }

  // Return original content for non-search tools
  return content;
}
