import { ToolResultContentPart } from '../../types';
import { StandardPanelContent } from '../../types/panelContent';
import {
  handleImageContent,
  handleSearchContent,
  handleCommandContent,
  handleScriptContent,
  handleFileContent,
  handleBrowserControlContent,
  handleLinkReaderContent,
  handleDefaultContent,
} from './handlers';

export function standardizeContent(panelContent: StandardPanelContent): ToolResultContentPart[] {
  const {
    type,
    source,
    title,
    error,
    arguments: toolArguments,
    _extra,
    isStreaming,
  } = panelContent;

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

  // Handle file operations with explicit path or content
  if (type === 'file' && (toolArguments?.path || toolArguments?.content)) {
    const content = toolArguments.content || (typeof source === 'string' ? source : null);
    const path = toolArguments.path || title;

    if (content && typeof content === 'string' && path) {
      return [
        {
          type: 'file_result',
          name: 'FILE_RESULT',
          path: path as string,
          content: content as string,
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

  // Handle different content types based on renderer type
  switch (type) {
    case 'image':
      return handleImageContent(source, title);

    case 'search_result':
      return handleSearchContent(source, toolArguments, title);

    case 'link_reader':
      return handleLinkReaderContent(source, toolArguments);

    case 'command_result':
      return handleCommandContent(source, toolArguments);

    case 'script_result':
      return handleScriptContent(source, toolArguments);

    case 'file_result':
      return handleFileContent(source, toolArguments);

    case 'browser_vision_control':
    case 'browser_result':
      return [
        {
          type: 'json',
          name: title || 'BROWSER_DATA',
          data: source,
          _extra,
        },
      ];

    case 'json':
    default:
      return handleDefaultContent(source);
  }
}
