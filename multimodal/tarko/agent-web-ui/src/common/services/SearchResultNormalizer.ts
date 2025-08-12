/**
 * Unified Search Result Normalizer
 *
 * This service centralizes all search result data transformation logic,
 * ensuring consistent data formats across the application.
 */

import { TOOL_NAMES } from '../constants/toolTypes';

// Standard search result interfaces
export interface StandardSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface NormalizedSearchContent {
  type: 'search_result';
  name: 'SEARCH_RESULTS';
  results: StandardSearchResult[];
  query: string;
  relatedSearches?: string[];
}

// Raw format interfaces for type safety
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

interface MCPWrappedContent {
  content: unknown;
}

interface OmniTarsTextContent {
  type: 'text';
  text: string;
}

interface SearchDataExtraction {
  results: StandardSearchResult[];
  query: string;
  relatedSearches?: string[];
}

interface SearchResultPart {
  results?: StandardSearchResult[];
  query?: string;
  relatedSearches?: string[];
}

interface NestedSearchResult {
  type: 'search_result';
  results?: StandardSearchResult[];
  query?: string;
  relatedSearches?: string[];
}

type ToolArguments = Record<string, unknown>;
type SearchContent = unknown;
type NormalizationResult = NormalizedSearchContent[] | SearchContent;

/**
 * Centralized search result normalizer
 */
export class SearchResultNormalizer {
  /**
   * Main normalization entry point
   */
  static normalize(
    toolName: string,
    content: SearchContent,
    args: ToolArguments = {},
  ): NormalizationResult {
    // Handle MCP wrapper format (temporary fix)
    const unwrappedContent = this.unwrapMCPContent(content);

    // Route to specific normalizer based on tool name
    switch (toolName) {
      case TOOL_NAMES.SEARCH:
        return this.normalizeOmniTarsSearch(unwrappedContent, args);
      case TOOL_NAMES.WEB_SEARCH:
        return this.normalizeWebSearch(unwrappedContent, args);
      default:
        return unwrappedContent;
    }
  }

  /**
   * Handle MCP wrapper format - temporary fix
   * FIXME: remove when Omni TARS doesn't directly return MCP result
   */
  private static unwrapMCPContent(content: SearchContent): SearchContent {
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

  /**
   * Normalize Omni TARS search results
   */
  private static normalizeOmniTarsSearch(
    content: SearchContent,
    args: ToolArguments,
  ): NormalizationResult {
    // Check if it's the expected Omni TARS format
    if (this.isOmniTarsTextContentArray(content)) {
      try {
        const textContent = content[0].text;
        if (typeof textContent === 'string') {
          const parsedContent: unknown = JSON.parse(textContent);

          // Validate the parsed structure
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
        }
      } catch (error) {
        console.warn('Failed to parse Omni TARS search result:', error);
      }
    }

    // Return original content if normalization fails
    return content;
  }

  /**
   * Normalize traditional web_search results
   */
  private static normalizeWebSearch(
    content: SearchContent,
    args: ToolArguments,
  ): NormalizationResult {
    if (this.isWebSearchResultArray(content)) {
      // Check if it's the old web_search format
      const hasWebSearchFormat = content.some(this.isWebSearchResult);

      if (hasWebSearchFormat) {
        return this.createNormalizedResult({
          results: (content as WebSearchResult[]).map((item) => ({
            title: item.title,
            url: item.url,
            snippet: item.content,
          })),
          query: this.extractQueryFromArgs(args),
        });
      }
    }

    return content;
  }

  /**
   * Extract query from tool arguments
   */
  private static extractQueryFromArgs(args: ToolArguments): string {
    const query = args?.query || args?.q;
    return typeof query === 'string' ? query : '';
  }

  /**
   * Create standardized search result format
   */
  private static createNormalizedResult(data: {
    results: StandardSearchResult[];
    query: string;
    relatedSearches?: string[];
  }): NormalizedSearchContent[] {
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

  /**
   * Type guard for Omni TARS text content array
   */
  private static isOmniTarsTextContentArray(
    content: SearchContent,
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

  /**
   * Type guard for web search result array
   */
  private static isWebSearchResultArray(content: SearchContent): content is unknown[] {
    return Array.isArray(content);
  }

  /**
   * Type guard for web search result item
   */
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

  /**
   * Validate Omni TARS response structure
   */
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

  /**
   * Extract search data from various formats for components
   */
  static extractSearchData(part: unknown): SearchDataExtraction | null {
    // Handle direct format (flat)
    if (this.isSearchResultPart(part)) {
      return {
        results: part.results || [],
        query: part.query || '',
        relatedSearches: part.relatedSearches,
      };
    }

    // Handle nested array format
    if (this.isNestedSearchResultArray(part)) {
      const searchResult = part[0];
      return {
        results: searchResult.results || [],
        query: searchResult.query || '',
        relatedSearches: searchResult.relatedSearches,
      };
    }

    return null;
  }

  /**
   * Type guard for search result part
   */
  private static isSearchResultPart(part: unknown): part is SearchResultPart {
    return typeof part === 'object' && part !== null && ('results' in part || 'query' in part);
  }

  /**
   * Type guard for nested search result array
   */
  private static isNestedSearchResultArray(part: unknown): part is NestedSearchResult[] {
    return (
      Array.isArray(part) &&
      part.length > 0 &&
      typeof part[0] === 'object' &&
      part[0] !== null &&
      'type' in part[0] &&
      (part[0] as Record<string, unknown>).type === 'search_result'
    );
  }

  /**
   * Check if content is already normalized
   */
  static isNormalized(content: unknown): content is NormalizedSearchContent[] {
    return (
      Array.isArray(content) &&
      content.length > 0 &&
      typeof content[0] === 'object' &&
      content[0] !== null &&
      'type' in content[0] &&
      (content[0] as Record<string, unknown>).type === 'search_result'
    );
  }

  /**
   * Check if content should be normalized (is search-related)
   */
  static shouldNormalize(toolName: string): boolean {
    return toolName === TOOL_NAMES.SEARCH || toolName === TOOL_NAMES.WEB_SEARCH;
  }
}
