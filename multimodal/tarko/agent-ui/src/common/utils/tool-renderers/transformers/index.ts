import { ToolResultTransformer, StandardToolResult, RendererType } from '../types';
import { fileTransformer } from './fileTransformer';
import { diffTransformer } from './diffTransformer';
import { commandTransformer } from './commandTransformer';
import { searchTransformer } from './searchTransformer';
import { browserTransformer } from './browserTransformer';
import { imageTransformer } from './imageTransformer';
import { tabbedFilesTransformer } from './tabbedFilesTransformer';
import { jsonTransformer } from './jsonTransformer';

/**
 * Static tool name to transformer mappings
 * These tools always use the same transformer regardless of content
 */
export const STATIC_TOOL_TRANSFORMERS: Record<string, ToolResultTransformer> = {
  // File operations
  'write_file': fileTransformer,
  'read_file': fileTransformer,
  'create_file': fileTransformer,
  
  // Edit operations
  'edit_file': diffTransformer,
  
  // Command operations
  'run_command': commandTransformer,
  'run_script': commandTransformer,
  'execute_bash': commandTransformer,
  'JupyterCI': commandTransformer,
  
  // Search operations
  'web_search': searchTransformer,
  'Search': searchTransformer,
  
  // Browser operations
  'browser_screenshot': imageTransformer,
  'browser_vision_control': browserTransformer,
  
  // Link operations
  'LinkReader': (toolName, content, args, metadata) => ({
    type: 'link_reader' as RendererType,
    data: { type: 'json', content },
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || toolName,
      ...metadata,
    },
  }),
};

/**
 * Content-based transformers for dynamic detection
 * These are applied when static mapping doesn't match
 */
export const CONTENT_TRANSFORMERS: ToolResultTransformer[] = [
  // str_replace_editor special handling
  (toolName, content, args, metadata) => {
    if (toolName === 'str_replace_editor') {
      if (typeof content === 'object' && content && 'prev_exist' in content && 'new_content' in content && 'old_content' in content) {
        return diffTransformer(toolName, content, args, metadata);
      }
      return fileTransformer(toolName, content, args, metadata);
    }
    return null as any; // Will be filtered out
  },
  
  // read_multiple_files detection
  tabbedFilesTransformer,
  
  // Image content detection
  imageTransformer,
  
  // Search result detection
  searchTransformer,
  
  // Command result detection
  commandTransformer,
  
  // Browser result detection
  browserTransformer,
];

/**
 * Main transformer function
 * Converts any tool result to standardized format
 */
export function transformToolResult(
  toolName: string,
  content: unknown,
  args?: unknown,
  metadata?: Partial<import('../types').ToolMetadata>,
): StandardToolResult {
  // Try static mapping first
  const staticTransformer = STATIC_TOOL_TRANSFORMERS[toolName];
  if (staticTransformer) {
    return staticTransformer(toolName, content, args, metadata);
  }
  
  // Try content-based transformers
  for (const transformer of CONTENT_TRANSFORMERS) {
    try {
      const result = transformer(toolName, content, args, metadata);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn(`Transformer failed for ${toolName}:`, error);
      continue;
    }
  }
  
  // Fallback to JSON renderer
  return jsonTransformer(toolName, content, args, metadata);
}
