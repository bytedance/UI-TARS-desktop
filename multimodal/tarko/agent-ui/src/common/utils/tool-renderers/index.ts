import { StandardToolResult, RendererType, ToolMetadata } from './types';
import { transformToolResult } from './transformers';

/**
 * Main API for the new tool renderer system
 * Transforms raw tool results into standardized format with type safety
 */
export function createStandardToolResult(
  toolName: string,
  content: unknown,
  args?: unknown,
  metadata?: Partial<ToolMetadata>,
): StandardToolResult {
  return transformToolResult(toolName, content, args, metadata);
}

/**
 * Legacy API compatibility - returns just the renderer type
 * @deprecated Use createStandardToolResult for new code
 */
export function determineToolRendererType(name: string, content: any): string {
  const result = transformToolResult(name, content);
  return result.type;
}

// Re-export types for external use
export type {
  StandardToolResult,
  RendererType,
  ToolMetadata,
  RendererData,
  ImageData,
  FileData,
  DiffData,
  CommandData,
  SearchData,
  BrowserData,
  TabbedFilesData,
  JsonData,
} from './types';

// Re-export transformers for advanced use cases
export { transformToolResult } from './transformers';
