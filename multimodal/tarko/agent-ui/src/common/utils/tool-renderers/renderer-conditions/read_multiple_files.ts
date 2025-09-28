import { FunctionToolToRendererCondition } from '../types';

/**
 * Condition for detecting read_multiple_files tool results
 * Checks if the content matches the structure of read_multiple_files output
 */
export const readMultipleFilesRendererCondition: FunctionToolToRendererCondition = (
  toolName: string,
  content: any,
): string | null => {
  // Check for explicit tool name match
  if (toolName === 'read_multiple_files') {
    return 'tabbed_files';
  }

  // Check for content structure that matches read_multiple_files output
  // Content can be in different formats, check both direct array and nested structure
  let contentToCheck = content;
  
  // If content is an object with source property, use that
  if (content && typeof content === 'object' && !Array.isArray(content) && content.source) {
    contentToCheck = content.source;
  }
  
  if (Array.isArray(contentToCheck)) {
    const isReadMultipleFiles = contentToCheck.every(item => 
      item && 
      typeof item === 'object' && 
      item.type === 'text' && 
      typeof item.text === 'string' &&
      // Look for file path patterns (path followed by colon and newline)
      /^[^:\n]+:\s*\n/.test(item.text)
    );

    if (isReadMultipleFiles && contentToCheck.length > 0) {
      return 'tabbed_files';
    }
  }

  return null;
};
