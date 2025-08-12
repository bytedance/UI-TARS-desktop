import { SearchService } from '@/common/services/SearchService';
import { ToolResultContentPart } from '../../types';
import { StandardPanelContent, PanelContentSource } from '../../types/panelContent';
import { isMultimodalContent, isCommandResult, isScriptResult, isFileResult } from './typeGuards';
import {
  extractImageUrl,
  parseImageContent,
  extractCommandResult,
  extractScriptResult,
  extractFileContent,
  findImageContent,
} from './extractors';

export function handleImageContent(source: unknown, title: string): ToolResultContentPart[] {
  if (typeof source === 'string') {
    const imageData = parseImageContent(source);
    if (imageData) {
      return [
        {
          type: 'image',
          imageData: imageData.base64Data,
          mimeType: imageData.mimeType,
          name: title,
        },
      ];
    }
  }

  if (Array.isArray(source)) {
    const imagePart = findImageContent(source);
    if (imagePart?.image_url?.url) {
      const imgSrc = imagePart.image_url.url;
      const imageData = parseImageContent(imgSrc);

      if (imageData) {
        return [
          {
            type: 'image',
            imageData: imageData.base64Data,
            mimeType: imageData.mimeType,
            name: title,
          },
        ];
      }
    }
  }

  return [
    {
      type: 'text',
      text: 'Image could not be displayed',
    },
  ];
}

export function handleSearchContent(
  source: unknown,
  toolArguments?: Record<string, unknown>,
  title?: string,
): ToolResultContentPart[] {
  // All search processing is now handled by eventProcessor using SearchService
  // This function should only receive already-normalized search data

  if (SearchService.isNormalizedSearchData(source)) {
    return source as ToolResultContentPart[];
  }

  // If we reach here, something went wrong in the pipeline
  console.warn('handleSearchContent: Received non-normalized search data', {
    source,
    toolArguments,
  });

  // Delegate back to SearchService as last resort
  const toolName = (toolArguments?.toolName as string) || 'unknown';
  const normalizedResult = SearchService.normalizeSearchContent(toolName, source, toolArguments);

  if (SearchService.isNormalizedSearchData(normalizedResult)) {
    return normalizedResult as ToolResultContentPart[];
  }

  // Absolute fallback - this should rarely happen
  return [
    {
      type: 'text',
      text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
    },
  ];
}

export function handleCommandContent(
  source: unknown,
  toolArguments?: Record<string, unknown>,
): ToolResultContentPart[] {
  if (isMultimodalContent(source)) {
    const commandResult = extractCommandResult(source);
    return [
      {
        type: 'command_result',
        name: 'COMMAND_RESULT',
        command: commandResult.command || (toolArguments?.command as string),
        stdout: commandResult.stdout || '',
        stderr: commandResult.stderr || '',
        exitCode: commandResult.exitCode,
      },
    ];
  }

  if (isCommandResult(source)) {
    return [
      {
        type: 'command_result',
        name: 'COMMAND_RESULT',
        command: source.command || (toolArguments?.command as string),
        stdout: source.output || source.stdout || '',
        stderr: source.stderr || '',
        exitCode: source.exitCode,
      },
    ];
  }

  return [
    {
      type: 'text',
      text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
    },
  ];
}

export function handleScriptContent(
  source: unknown,
  toolArguments?: Record<string, unknown>,
): ToolResultContentPart[] {
  if (isMultimodalContent(source)) {
    const scriptResult = extractScriptResult(source);
    return [
      {
        type: 'script_result',
        name: 'SCRIPT_RESULT',
        script: (toolArguments?.script as string) || '',
        interpreter: (toolArguments?.interpreter as string) || 'python',
        cwd: (toolArguments?.cwd as string) || undefined,
        stdout: scriptResult.stdout || '',
        stderr: scriptResult.stderr || '',
        exitCode: scriptResult.exitCode,
      },
    ];
  }

  if (isScriptResult(source)) {
    return [
      {
        type: 'script_result',
        name: 'SCRIPT_RESULT',
        script: source.script || (toolArguments?.script as string) || '',
        interpreter: source.interpreter || (toolArguments?.interpreter as string) || 'python',
        cwd: source.cwd || (toolArguments?.cwd as string) || undefined,
        stdout: source.stdout || '',
        stderr: source.stderr || '',
        exitCode: source.exitCode,
      },
    ];
  }

  return [
    {
      type: 'text',
      text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
    },
  ];
}

export function handleFileContent(
  source: unknown,
  toolArguments?: Record<string, unknown>,
): ToolResultContentPart[] {
  if (isMultimodalContent(source)) {
    const { content } = extractFileContent(source);
    if (content) {
      return [
        {
          type: 'file_result',
          name: 'FILE_RESULT',
          path: (toolArguments?.path as string) || 'Unknown file',
          content,
        },
      ];
    }
  }

  if (isFileResult(source)) {
    return [
      {
        type: 'file_result',
        name: 'FILE_RESULT',
        path: source.path || (toolArguments?.path as string) || 'Unknown file',
        content: source.content || 'No content available',
      },
    ];
  }

  if (typeof source === 'string') {
    return [
      {
        type: 'file_result',
        name: 'FILE_RESULT',
        path: (toolArguments?.path as string) || 'Unknown file',
        content: source,
      },
    ];
  }

  return [
    {
      type: 'text',
      text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
    },
  ];
}

export function handleBrowserControlContent(
  panelContent: StandardPanelContent,
  source: PanelContentSource,
): ToolResultContentPart[] {
  const { toolCallId, arguments: toolArguments, originalContent } = panelContent;

  const environmentImage = Array.isArray(originalContent) ? extractImageUrl(originalContent) : null;

  return [
    {
      type: 'browser_control',
      name: 'BROWSER_CONTROL',
      toolCallId,
      thought: (toolArguments?.thought as string) || '',
      step: (toolArguments?.step as string) || '',
      action: (toolArguments?.action as string) || '',
      status: source.status,
      environmentImage,
    },
  ];
}

export function handleLinkReaderContent(
  source: unknown,
  toolArguments?: Record<string, unknown>,
): ToolResultContentPart[] {
  // Handle LinkReader tool results specifically
  return [
    {
      type: 'link_reader',
      name: 'LINK_READER',
      data: source,
      text: typeof source === 'string' ? source : undefined,
    },
  ];
}

export function handleDefaultContent(source: unknown): ToolResultContentPart[] {
  if (typeof source === 'object' && source !== null) {
    return [
      {
        type: 'json',
        name: 'JSON_DATA',
        data: source,
      },
    ];
  }

  return [
    {
      type: 'text',
      text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
    },
  ];
}
