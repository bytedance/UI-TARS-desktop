import { ToolResultTransformer, ImageData, RendererType } from '../types';

/**
 * Transforms image-related tool results to standardized image data
 */
export const imageTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  // Only transform if this is actually an image tool or has image content
  if (!isImageTool(toolName) && !hasImageContent(content)) {
    return null as any;
  }
  
  let src = '';
  let alt = '';
  let width: number | undefined;
  let height: number | undefined;
  
  // Extract image data from various sources
  if (typeof content === 'string') {
    // Base64 image or URL
    if (content.startsWith('data:image/') || content.startsWith('http')) {
      src = content;
    } else {
      // Try to extract image URL from text
      const urlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|svg|webp|bmp)/i);
      if (urlMatch) {
        src = urlMatch[0];
      }
    }
  } else if (Array.isArray(content)) {
    // Look for image_url type in array
    for (const item of content) {
      if (item && typeof item === 'object' && item.type === 'image_url') {
        if ('image_url' in item && typeof item.image_url === 'object' && item.image_url) {
          const imageUrl = item.image_url as { url?: string; detail?: string };
          src = imageUrl.url || '';
          alt = imageUrl.detail || '';
        } else if ('url' in item && typeof item.url === 'string') {
          src = item.url;
        }
        break;
      }
    }
  } else if (typeof content === 'object' && content) {
    // Handle structured image content
    if ('url' in content && typeof content.url === 'string') {
      src = content.url;
    } else if ('src' in content && typeof content.src === 'string') {
      src = content.src;
    } else if ('image_url' in content && typeof content.image_url === 'object' && content.image_url) {
      const imageUrl = content.image_url as { url?: string; detail?: string };
      src = imageUrl.url || '';
      alt = imageUrl.detail || '';
    }
    
    if ('alt' in content && typeof content.alt === 'string') {
      alt = content.alt;
    }
    if ('width' in content && typeof content.width === 'number') {
      width = content.width;
    }
    if ('height' in content && typeof content.height === 'number') {
      height = content.height;
    }
  }
  
  // Extract from arguments if not found in content
  if (!src && args && typeof args === 'object') {
    if ('image_url' in args && typeof args.image_url === 'string') {
      src = args.image_url;
    } else if ('url' in args && typeof args.url === 'string') {
      src = args.url;
    } else if ('path' in args && typeof args.path === 'string') {
      // For file-based images
      const path = args.path;
      if (isImageFile(path)) {
        src = path;
        alt = path.split('/').pop() || '';
      }
    }
  }
  
  // Default alt text
  if (!alt) {
    alt = metadata?.title || toolName || 'Image';
  }
  
  const imageData: ImageData = {
    type: 'image',
    src,
    alt,
    width,
    height,
  };
  
  return {
    type: 'image' as RendererType,
    data: imageData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || alt || 'Image',
      ...metadata,
    },
  };
};

/**
 * Check if tool name indicates an image tool
 */
function isImageTool(toolName: string): boolean {
  const imageTools = [
    'browser_screenshot',
    'screenshot',
    'capture_screen',
    'image_generation',
    'dalle',
  ];
  return imageTools.includes(toolName) || toolName.includes('image') || toolName.includes('screenshot');
}

/**
 * Check if content contains image data
 */
function hasImageContent(content: unknown): boolean {
  if (typeof content === 'string') {
    return content.startsWith('data:image/') || 
           content.startsWith('http') && /\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(content);
  }
  
  if (Array.isArray(content)) {
    return content.some(item => 
      item && 
      typeof item === 'object' && 
      item.type === 'image_url'
    );
  }
  
  if (typeof content === 'object' && content) {
    return 'image_url' in content || 
           ('url' in content && typeof content.url === 'string' && isImageUrl(content.url)) ||
           ('src' in content && typeof content.src === 'string' && isImageUrl(content.src));
  }
  
  return false;
}

/**
 * Check if a URL points to an image
 */
function isImageUrl(url: string): boolean {
  return url.startsWith('data:image/') || 
         /\.(jpg|jpeg|png|gif|svg|webp|bmp)(\?|$)/i.test(url);
}

/**
 * Check if a file path is an image file
 */
function isImageFile(path: string): boolean {
  return /\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(path);
}
