import { ChatCompletionTool } from 'openai/resources/index.mjs';

/**
 * Extract tool name list from tool object to avoid redundant logging
 */
export function extractToolNames(tools: ChatCompletionTool[]): string[] {
  return tools.map((tool) => {
    if (tool.type === 'function' && tool.function?.name) {
      return tool.function.name;
    }
    return 'unknown_tool';
  });
}
