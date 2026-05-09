import { Message, ToolCall, ToolResult, WorkspaceItem } from '@/lib/types';

// Parse action blocks from assistant messages
export function parseActions(text: string): ToolCall[] {
  const actions: ToolCall[] = [];
  const actionRegex = /<action[^>]*type="([^"]+)"[^>]*>([\s\S]*?)<\/action>/g;
  
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    const type = match[1];
    const content = match[2];
    
    try {
      const params = JSON.parse(content);
      actions.push({
        id: `${Date.now()}-${Math.random()}`,
        type,
        params,
        status: 'pending',
      });
    } catch (e) {
      console.error('[v0] Failed to parse action:', e);
    }
  }
  
  return actions;
}

// Extract thinking blocks
export function extractThinking(text: string): string | null {
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/;
  const match = text.match(thinkingRegex);
  return match ? match[1] : null;
}

// Extract visible content after removing thinking
export function removeThinking(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
}

// Parse tool results from tool_result messages
export function parseToolResult(content: string): ToolResult | null {
  try {
    return JSON.parse(content);
  } catch {
    return {
      type: 'text',
      content,
    };
  }
}
