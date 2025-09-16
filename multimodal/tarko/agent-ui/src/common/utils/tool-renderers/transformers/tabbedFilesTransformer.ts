import { ToolResultTransformer, TabbedFilesData, RendererType } from '../types';

/**
 * Transforms read_multiple_files tool results to standardized tabbed files data
 */
export const tabbedFilesTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  // Only transform if this is read_multiple_files or has multiple file content
  if (!isMultipleFilesTool(toolName) && !hasMultipleFilesContent(content)) {
    return null as any;
  }
  
  const files: Array<{ path: string; content: string; language?: string }> = [];
  
  // Extract files from content
  let contentToCheck = content;
  
  // If content is an object with source property, use that
  if (content && typeof content === 'object' && !Array.isArray(content) && 'source' in content) {
    contentToCheck = content.source;
  }
  
  if (Array.isArray(contentToCheck)) {
    for (const item of contentToCheck) {
      if (item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string') {
        // Look for file path patterns (path followed by colon and newline)
        const match = item.text.match(/^([^:\n]+):\s*\n([\s\S]*)$/);
        if (match) {
          const [, path, content] = match;
          const extension = path.split('.').pop()?.toLowerCase() || '';
          const language = getLanguageFromExtension(extension);
          
          files.push({
            path: path.trim(),
            content: content || '',
            language,
          });
        }
      }
    }
  } else if (typeof contentToCheck === 'string') {
    // Try to parse multiple files from a single string
    const fileBlocks = contentToCheck.split(/\n(?=[^:\n]+:\s*\n)/);
    for (const block of fileBlocks) {
      const match = block.match(/^([^:\n]+):\s*\n([\s\S]*)$/);
      if (match) {
        const [, path, content] = match;
        const extension = path.split('.').pop()?.toLowerCase() || '';
        const language = getLanguageFromExtension(extension);
        
        files.push({
          path: path.trim(),
          content: content || '',
          language,
        });
      }
    }
  }
  
  // If no files were parsed, this isn't a multiple files result
  if (files.length === 0) {
    return null as any;
  }
  
  const tabbedFilesData: TabbedFilesData = {
    type: 'tabbed_files',
    files,
  };
  
  return {
    type: 'tabbed_files' as RendererType,
    data: tabbedFilesData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || `${files.length} files`,
      ...metadata,
    },
  };
};

/**
 * Check if tool name indicates a multiple files tool
 */
function isMultipleFilesTool(toolName: string): boolean {
  return toolName === 'read_multiple_files';
}

/**
 * Check if content contains multiple files
 */
function hasMultipleFilesContent(content: unknown): boolean {
  let contentToCheck = content;
  
  // If content is an object with source property, use that
  if (content && typeof content === 'object' && !Array.isArray(content) && 'source' in content) {
    contentToCheck = content.source;
  }
  
  if (Array.isArray(contentToCheck)) {
    const filePatternCount = contentToCheck.filter(item => 
      item && 
      typeof item === 'object' && 
      item.type === 'text' && 
      typeof item.text === 'string' &&
      // Look for file path patterns (path followed by colon and newline)
      /^[^:\n]+:\s*\n/.test(item.text)
    ).length;
    
    return filePatternCount > 1; // Multiple files
  }
  
  if (typeof contentToCheck === 'string') {
    // Count file pattern occurrences
    const matches = contentToCheck.match(/\n[^:\n]+:\s*\n/g);
    return (matches?.length || 0) > 1;
  }
  
  return false;
}

/**
 * Get Monaco editor language from file extension
 */
function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'php': 'php',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'markdown': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'lua': 'lua',
    'perl': 'perl',
    'dockerfile': 'dockerfile',
  };
  
  return languageMap[extension] || 'text';
}
