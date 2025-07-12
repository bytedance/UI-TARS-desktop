import { ToolResultContentPart } from '../../types';
import { StandardPanelContent, SearchResult, PanelContentSource } from '../../types/panelContent';
import {
  isMultimodalContent,
  isSearchResults,
  isCommandResult,
  isScriptResult,
  isFileResult,
  isObjectWithResults,
} from './typeGuards';
import {
  extractImageUrl,
  parseImageContent,
  extractSearchResults,
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
  if (isSearchResults(source)) {
    return [
      {
        type: 'search_result',
        name: 'SEARCH_RESULTS',
        results: source.map(
          (item): SearchResult => ({
            title: item.title,
            url: item.url,
            snippet: item.content || item.snippet || '',
          }),
        ),
        query: (toolArguments?.query as string) || title?.replace(/^Search: /i, ''),
      },
    ];
  }

  if (isMultimodalContent(source)) {
    const { results, query } = extractSearchResults(source);
    return [
      {
        type: 'search_result',
        name: 'SEARCH_RESULTS',
        results,
        query,
      },
    ];
  }

  if (isObjectWithResults(source)) {
    return [
      {
        type: 'search_result',
        name: 'SEARCH_RESULTS',
        results: source.results,
        query: source.query,
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
