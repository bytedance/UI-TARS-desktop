/**
 * Unified Search Service
 *
 * This service centralizes ALL search-related logic in the web UI:
 * - Data normalization from different search tools
 * - Format validation and type safety
 * - Consistent data structure across the application
 *
 * All search-related processing should go through this service.
 */

// Tool name constants for search tools
const SEARCH_TOOL_NAMES = {
  SEARCH: 'Search',
  WEB_SEARCH: 'web_search',
} as const;

// ============================================================================
// STANDARD INTERFACES - Single source of truth for search data
// ============================================================================

export interface StandardSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface NormalizedSearchData {
  type: 'search_result';
  name: 'SEARCH_RESULTS';
  results: StandardSearchResult[];
  query: string;
  relatedSearches?: string[];
}

export interface SearchDataExtraction {
  results: StandardSearchResult[];
  query: string;
  relatedSearches?: string[];
}

// ============================================================================
// RAW FORMAT INTERFACES - For incoming data validation
// ============================================================================

interface OmniTarsSearchResponse {
  searchParameters: { q: string };
  organic: Array<{
    title: string;
    link: string;
    snippet?: string;
  }>;
  relatedSearches?: Array<{ query: string }>;
}

interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface OmniTarsTextContent {
  type: 'text';
  text: string;
}

export function isOmniTarsTextContentArray(
  content: RawSearchContent,
): content is OmniTarsTextContent[] {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    typeof content[0] === 'object' &&
    content[0] !== null &&
    'type' in content[0] &&
    content[0].type === 'text' &&
    'text' in content[0] &&
    typeof content[0].text === 'string'
  );
}

interface MCPWrappedContent {
  content: unknown;
}

type ToolArguments = Record<string, unknown>;
type RawSearchContent = unknown;

// ============================================================================
// UNIFIED SEARCH SERVICE
// ============================================================================

export class SearchService {
  /**
   * Main entry point - normalize any search content to standard format
   */
  static normalizeSearchContent(
    toolName: string,
    content: RawSearchContent,
    args: ToolArguments = {},
  ): NormalizedSearchData[] | RawSearchContent {
    if (!this.isSearchTool(toolName)) {
      return content;
    }

    // Handle MCP wrapper format (temporary fix for Omni-TARS)
    const unwrappedContent = this.unwrapMCPContent(content);

    // Route to specific normalizer
    switch (toolName) {
      case SEARCH_TOOL_NAMES.SEARCH:
        return this.normalizeOmniTarsSearch(unwrappedContent, args);
      case SEARCH_TOOL_NAMES.WEB_SEARCH:
        return this.normalizeWebSearch(unwrappedContent, args);
      default:
        return content;
    }
  }

  /**
   * Extract search data for UI components
   */
  static extractSearchData(part: unknown): SearchDataExtraction | null {
    // Handle already normalized format
    if (this.isNormalizedSearchData(part)) {
      const searchData = Array.isArray(part) ? part[0] : part;
      return {
        results: searchData.results || [],
        query: searchData.query || '',
        relatedSearches: searchData.relatedSearches,
      };
    }

    // Handle flat object format
    if (this.isSearchResultObject(part)) {
      return {
        results: part.results || [],
        query: part.query || '',
        relatedSearches: part.relatedSearches,
      };
    }

    return null;
  }

  /**
   * Check if tool is search-related
   */
  static isSearchTool(toolName: string): boolean {
    return toolName === SEARCH_TOOL_NAMES.SEARCH || toolName === SEARCH_TOOL_NAMES.WEB_SEARCH;
  }

  /**
   * Check if content is already normalized
   */
  static isNormalizedSearchData(
    content: unknown,
  ): content is NormalizedSearchData[] | NormalizedSearchData {
    if (Array.isArray(content) && content.length > 0) {
      const item = content[0];
      return this.isNormalizedSearchItem(item);
    }
    return this.isNormalizedSearchItem(content);
  }

  // ============================================================================
  // PRIVATE NORMALIZATION METHODS
  // ============================================================================

  private static normalizeOmniTarsSearch(
    content: RawSearchContent,
    args: ToolArguments,
  ): NormalizedSearchData[] | RawSearchContent {
    if (isOmniTarsTextContentArray(content)) {
      try {
        const textContent = content[0].text;
        const parsedContent: unknown = JSON.parse(textContent);

        if (this.isValidOmniTarsResponse(parsedContent)) {
          return this.createNormalizedResult({
            results: parsedContent.organic.map((item) => ({
              title: item.title,
              url: item.link,
              snippet: item.snippet || '',
            })),
            query: parsedContent.searchParameters.q,
            relatedSearches: parsedContent.relatedSearches?.map((rs) => rs.query),
          });
        }
      } catch (error) {
        console.warn('Failed to parse Omni-TARS search result:', error);
      }
    }

    return content;
  }

  private static normalizeWebSearch(
    content: RawSearchContent,
    args: ToolArguments,
  ): NormalizedSearchData[] | RawSearchContent {
    if (Array.isArray(content) && content.some(this.isWebSearchResult)) {
      return this.createNormalizedResult({
        results: (content as WebSearchResult[]).map((item) => ({
          title: item.title,
          url: item.url,
          snippet: item.content,
        })),
        query: this.extractQueryFromArgs(args),
      });
    }

    return content;
  }

  private static createNormalizedResult(data: {
    results: StandardSearchResult[];
    query: string;
    relatedSearches?: string[];
  }): NormalizedSearchData[] {
    return [
      {
        type: 'search_result',
        name: 'SEARCH_RESULTS',
        results: data.results,
        query: data.query,
        relatedSearches: data.relatedSearches,
      },
    ];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static unwrapMCPContent(content: RawSearchContent): RawSearchContent {
    if (
      typeof content === 'object' &&
      content !== null &&
      'content' in content &&
      Object.keys(content).length === 1
    ) {
      return (content as MCPWrappedContent).content;
    }
    return content;
  }

  private static extractQueryFromArgs(args: ToolArguments): string {
    const query = args?.query || args?.q;
    return typeof query === 'string' ? query : '';
  }

  // ============================================================================
  // TYPE GUARDS
  // ============================================================================

  private static isNormalizedSearchItem(item: unknown): item is NormalizedSearchData {
    return (
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      (item as Record<string, unknown>).type === 'search_result' &&
      'name' in item &&
      (item as Record<string, unknown>).name === 'SEARCH_RESULTS'
    );
  }

  private static isSearchResultObject(part: unknown): part is {
    results?: StandardSearchResult[];
    query?: string;
    relatedSearches?: string[];
  } {
    return typeof part === 'object' && part !== null && ('results' in part || 'query' in part);
  }

  private static isWebSearchResult(item: unknown): item is WebSearchResult {
    return (
      typeof item === 'object' &&
      item !== null &&
      'title' in item &&
      'url' in item &&
      'content' in item &&
      typeof (item as Record<string, unknown>).title === 'string' &&
      typeof (item as Record<string, unknown>).url === 'string' &&
      typeof (item as Record<string, unknown>).content === 'string'
    );
  }

  private static isValidOmniTarsResponse(data: unknown): data is OmniTarsSearchResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      'searchParameters' in data &&
      typeof (data as Record<string, unknown>).searchParameters === 'object' &&
      (data as Record<string, unknown>).searchParameters !== null &&
      'q' in (data as Record<string, unknown>).searchParameters &&
      typeof ((data as Record<string, unknown>).searchParameters as Record<string, unknown>).q ===
        'string' &&
      'organic' in data &&
      Array.isArray((data as Record<string, unknown>).organic)
    );
  }
}
