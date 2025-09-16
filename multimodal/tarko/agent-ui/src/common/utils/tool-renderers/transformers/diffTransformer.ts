import { ToolResultTransformer, DiffData, RendererType } from '../types';

/**
 * Transforms diff-related tool results to standardized diff data
 */
export const diffTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  let filePath = '';
  let oldContent = '';
  let newContent = '';
  
  // Extract file path
  if (args && typeof args === 'object' && 'path' in args && typeof args.path === 'string') {
    filePath = args.path;
  }
  
  // Extract diff content from str_replace_editor format
  if (typeof content === 'object' && content) {
    if ('path' in content && typeof content.path === 'string') {
      filePath = content.path;
    }
    if ('old_content' in content && typeof content.old_content === 'string') {
      oldContent = content.old_content;
    }
    if ('new_content' in content && typeof content.new_content === 'string') {
      newContent = content.new_content;
    }
  }
  
  // Fallback: try to extract from arguments
  if (!oldContent && !newContent && args && typeof args === 'object') {
    if ('old_str' in args && typeof args.old_str === 'string') {
      oldContent = args.old_str;
    }
    if ('new_str' in args && typeof args.new_str === 'string') {
      newContent = args.new_str;
    }
  }
  
  // Determine language from file extension
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const language = getLanguageFromExtension(extension);
  
  const diffData: DiffData = {
    type: 'diff',
    path: filePath,
    oldContent,
    newContent,
    language,
  };
  
  return {
    type: 'diff_result' as RendererType,
    data: diffData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || `Edit: ${filePath.split('/').pop() || 'file'}`,
      ...metadata,
    },
  };
};

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
