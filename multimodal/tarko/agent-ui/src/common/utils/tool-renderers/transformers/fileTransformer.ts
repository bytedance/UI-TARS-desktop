import { ToolResultTransformer, FileData, RendererType } from '../types';

/**
 * Transforms file-related tool results to standardized file data
 */
export const fileTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  let filePath = '';
  let fileContent = '';
  
  // Extract file path
  if (args && typeof args === 'object' && 'path' in args && typeof args.path === 'string') {
    filePath = args.path;
  }
  
  // Extract file content from various sources
  if (args && typeof args === 'object') {
    // From arguments (write_file, create_file)
    if ('content' in args && typeof args.content === 'string') {
      fileContent = args.content;
    } else if ('file_text' in args && typeof args.file_text === 'string') {
      fileContent = args.file_text;
    }
  }
  
  // From content (read_file)
  if (!fileContent) {
    if (typeof content === 'string') {
      fileContent = content;
    } else if (Array.isArray(content)) {
      // Handle array format from read_file
      fileContent = content
        .filter(item => item && typeof item === 'object' && item.type === 'text')
        .map(item => item.text)
        .join('');
    } else if (typeof content === 'object' && content) {
      // Handle str_replace_editor view command
      if ('output' in content && typeof content.output === 'string') {
        fileContent = content.output;
      }
    }
  }
  
  // Determine language from file extension
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const language = getLanguageFromExtension(extension);
  
  const fileData: FileData = {
    type: 'file',
    path: filePath,
    content: fileContent,
    language,
    size: fileContent.length,
  };
  
  return {
    type: 'file_result' as RendererType,
    data: fileData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || filePath.split('/').pop() || toolName,
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
