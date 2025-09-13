import { ToolResultTransformer, JsonData, RendererType } from '../types';

/**
 * Transforms any tool result to JSON format as a fallback
 * This is the last resort transformer when no other transformer matches
 */
export const jsonTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  const jsonData: JsonData = {
    type: 'json',
    content,
  };
  
  return {
    type: 'json' as RendererType,
    data: jsonData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || toolName,
      ...metadata,
    },
  };
};
