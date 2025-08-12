import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { MultimodalContent, SearchResult, CommandResult, FileResult, ScriptResult } from './types';

export function isMultimodalContent(source: unknown): source is MultimodalContent[] {
  return (
    Array.isArray(source) &&
    source.length > 0 &&
    typeof source[0] === 'object' &&
    source[0] !== null &&
    'type' in source[0]
  );
}

export function isSearchResults(source: unknown): source is SearchResult[] {
  return (
    Array.isArray(source) &&
    source.length > 0 &&
    typeof source[0] === 'object' &&
    source[0] !== null &&
    'title' in source[0] &&
    'url' in source[0]
  );
}

export function isCommandResult(source: unknown): source is CommandResult {
  return (
    source !== null &&
    typeof source === 'object' &&
    ('command' in source || 'output' in source || 'stdout' in source)
  );
}

export function isFileResult(source: unknown): source is FileResult {
  return source !== null && typeof source === 'object' && ('path' in source || 'content' in source);
}

export function isScriptResult(source: unknown): source is ScriptResult {
  return (
    source !== null && typeof source === 'object' && ('script' in source || 'interpreter' in source)
  );
}

export function isObjectWithResults(
  source: unknown,
): source is { results: SearchResult[]; query?: string } {
  return (
    source !== null &&
    typeof source === 'object' &&
    'results' in source &&
    Array.isArray((source as { results: unknown }).results)
  );
}

// Type guard for omni TARS search results format
export function isOmniTarsSearchResult(source: unknown): source is {
  searchParameters: { q: string; [k: string]: any };
  organic: Array<{ title: string; link: string; snippet: string; [k: string]: any }>;
  relatedSearches?: Array<{ query: string }>;
} {
  return (
    source !== null &&
    typeof source === 'object' &&
    'searchParameters' in source &&
    'organic' in source &&
    Array.isArray((source as any).organic) &&
    typeof (source as any).searchParameters === 'object' &&
    typeof (source as any).searchParameters.q === 'string'
  );
}
