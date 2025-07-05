import { ToolResultContentPart } from '../../types';
import { StandardPanelContent } from '../../types/panelContent';
import {
  handleImageContent,
  handleSearchContent,
  handleCommandContent,
  handleScriptContent,
  handleFileContent,
  handleBrowserControlContent,
  handleDefaultContent,
} from './handlers';

export function standardizeContent(panelContent: StandardPanelContent): ToolResultContentPart[] {
  console.log('panelContent', panelContent);

  const { type, source, title, error, arguments: toolArguments, _extra } = panelContent;

  // Handle error first
  if (error) {
    return [
      {
        type: 'text',
        name: 'ERROR',
        text: error,
      },
    ];
  }

  // Handle file operations with explicit path
  if (type === 'file' && toolArguments?.path) {
    const content = toolArguments.content || (typeof source === 'string' ? source : null);

    // Handle streaming write_file operation
    if (toolArguments?.path && toolArguments?.content !== undefined) {
      return [
        {
          type: 'file_result',
          name: 'FILE_RESULT',
          path: toolArguments.path as string,
          content: toolArguments.content as string,
        },
      ];
    }

    if (content && typeof content === 'string') {
      return [
        {
          type: 'file_result',
          name: 'FILE_RESULT',
          path: toolArguments.path as string,
          content,
        },
      ];
    }

    return handleFileContent(source, toolArguments);
  }

  // Handle browser vision control
  if (type === 'browser_vision_control') {
    return handleBrowserControlContent(panelContent, source);
  }

  // Handle image content in multimodal format
  if (Array.isArray(source) && source.some((part) => part?.type === 'image_url')) {
    return handleImageContent(source, title);
  }

  console.log('type', type);

  // Handle different content types
  switch (type) {
    case 'image':
      return handleImageContent(source, title);

    case 'search':
      return handleSearchContent(source, toolArguments, title);

    case 'command':
      return handleCommandContent(source, toolArguments);

    case 'script':
      return handleScriptContent(source, toolArguments);

    case 'browser':
      return [
        {
          type: 'json',
          name: title || 'BROWSER_DATA',
          data: source,
          _extra,
        },
      ];

    case 'file':
    case 'read_file':
    case 'write_file':
      return handleFileContent(source, toolArguments);

    default:
      return handleDefaultContent(source);
  }
}
