import { ToolResultTransformer, BrowserData, RendererType } from '../types';

/**
 * Transforms browser-related tool results to standardized browser data
 */
export const browserTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  // Only transform if this is actually a browser tool or has browser-like content
  if (!isBrowserTool(toolName) && !hasBrowserContent(content)) {
    return null as any;
  }
  
  let url = '';
  let screenshot = '';
  let action = '';
  let details: Record<string, unknown> = {};
  
  // Extract URL from arguments
  if (args && typeof args === 'object' && 'url' in args && typeof args.url === 'string') {
    url = args.url;
  }
  
  // Extract action from arguments
  if (args && typeof args === 'object' && 'action' in args && typeof args.action === 'string') {
    action = args.action;
  }
  
  // Extract screenshot from metadata extra
  if (metadata && metadata._extra && typeof metadata._extra === 'object') {
    if ('currentScreenshot' in metadata._extra && typeof metadata._extra.currentScreenshot === 'string') {
      screenshot = metadata._extra.currentScreenshot;
    }
  }
  
  // Extract data from content
  if (typeof content === 'string') {
    // Look for navigation messages
    if (content.includes('Navigated to ')) {
      const lines = content.split('\n');
      url = lines[0].replace('Navigated to ', '').trim();
      action = 'navigate';
      details = { message: lines.slice(1).join('\n').trim() };
    } else {
      details = { output: content };
    }
  } else if (Array.isArray(content)) {
    // Handle array format
    const textContent = content
      .filter(item => item && typeof item === 'object' && item.type === 'text')
      .map(item => item.text)
      .join('');
    
    if (textContent.includes('Navigated to ')) {
      const lines = textContent.split('\n');
      url = lines[0].replace('Navigated to ', '').trim();
      action = 'navigate';
      details = { message: lines.slice(1).join('\n').trim() };
    } else {
      details = { output: textContent };
    }
  } else if (typeof content === 'object' && content) {
    // Handle structured content
    details = { ...content };
    
    if ('url' in content && typeof content.url === 'string') {
      url = content.url;
    }
    if ('action' in content && typeof content.action === 'string') {
      action = content.action;
    }
    if ('screenshot' in content && typeof content.screenshot === 'string') {
      screenshot = content.screenshot;
    }
  }
  
  const browserData: BrowserData = {
    type: 'browser',
    url,
    screenshot,
    action,
    details,
  };
  
  return {
    type: 'browser_result' as RendererType,
    data: browserData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || `Browser: ${action || url || toolName}`,
      ...metadata,
    },
  };
};

/**
 * Check if tool name indicates a browser tool
 */
function isBrowserTool(toolName: string): boolean {
  const browserTools = [
    'browser_vision_control',
    'browser_screenshot',
    'browser_navigate',
    'browser_click',
    'browser_type',
  ];
  return browserTools.includes(toolName) || toolName.includes('browser');
}

/**
 * Check if content looks like browser output
 */
function hasBrowserContent(content: unknown): boolean {
  if (typeof content === 'string') {
    return content.includes('Navigated to ') || content.includes('Browser');
  }
  
  if (Array.isArray(content)) {
    const textContent = content
      .filter(item => item && typeof item === 'object' && item.type === 'text')
      .map(item => item.text)
      .join('');
    return textContent.includes('Navigated to ') || textContent.includes('Browser');
  }
  
  if (typeof content === 'object' && content) {
    return 'url' in content || 'screenshot' in content || 'action' in content;
  }
  
  return false;
}
