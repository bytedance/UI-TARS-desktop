/**
 * Tool Result Service
 *
 * This service handles tool result processing and type inference:
 * - Determines the appropriate content type for rendering
 * - Provides tool-specific data transformation
 * - Maintains separation of concerns between different tool types
 */

import { TOOL_NAMES } from '../constants/toolTypes';
import { ToolResultContentPart } from '../../standalone/workspace/types';

export interface ToolResultProcessingResult {
  contentParts: ToolResultContentPart[];
  toolCategory: string;
}

export class ToolResultService {
  /**
   * Process tool result and determine appropriate content type
   */
  static processToolResult(
    toolName: string,
    content: unknown,
    args: Record<string, unknown> = {},
  ): ToolResultProcessingResult {
    // Handle LinkReader specifically
    if (toolName === TOOL_NAMES.LINK_READER) {
      return this.processLinkReaderResult(content, args);
    }

    // Handle other tools with their specific processing
    // This maintains separation of concerns
    return this.processGenericResult(content, args);
  }

  /**
   * Process LinkReader results specifically
   */
  private static processLinkReaderResult(
    content: unknown,
    args: Record<string, unknown>,
  ): ToolResultProcessingResult {
    // Create a content part specifically for LinkReader
    const contentPart: ToolResultContentPart = {
      type: 'link_reader', // This will trigger LinkReaderRenderer
      name: 'LINK_READER_RESULTS',
      data: content,
      text: this.extractTextFromContent(content),
    };

    return {
      contentParts: [contentPart],
      toolCategory: 'content',
    };
  }

  /**
   * Process generic tool results
   */
  private static processGenericResult(
    content: unknown,
    args: Record<string, unknown>,
  ): ToolResultProcessingResult {
    // For other tools, use existing logic or create generic content parts
    const contentPart: ToolResultContentPart = {
      type: 'json',
      name: 'GENERIC_RESULT',
      data: content,
    };

    return {
      contentParts: [contentPart],
      toolCategory: 'other',
    };
  }

  /**
   * Extract text content from various data formats
   */
  private static extractTextFromContent(content: unknown): string | undefined {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content) && content.length > 0) {
      const firstItem = content[0];
      if (typeof firstItem === 'object' && firstItem !== null && 'text' in firstItem) {
        return firstItem.text as string;
      }
    }

    if (typeof content === 'object' && content !== null && 'text' in content) {
      return (content as { text: string }).text;
    }

    return undefined;
  }

  /**
   * Check if content should use LinkReader renderer
   */
  static isLinkReaderContent(toolName: string): boolean {
    return toolName === TOOL_NAMES.LINK_READER;
  }

  /**
   * Infer content type from tool name and content structure
   */
  static inferContentType(toolName: string, content: unknown): string {
    // LinkReader gets its own type
    if (toolName === TOOL_NAMES.LINK_READER) {
      return 'link_reader';
    }

    // Search tools get search_result type
    if (toolName === TOOL_NAMES.SEARCH || toolName === TOOL_NAMES.WEB_SEARCH) {
      return 'search_result';
    }

    // Browser tools
    if (toolName.startsWith('browser_')) {
      return 'browser_result';
    }

    // Command tools
    if (toolName === TOOL_NAMES.RUN_COMMAND) {
      return 'command_result';
    }

    // Script tools
    if (toolName === TOOL_NAMES.RUN_SCRIPT) {
      return 'script_result';
    }

    // Default to json for unknown types
    return 'json';
  }
}
