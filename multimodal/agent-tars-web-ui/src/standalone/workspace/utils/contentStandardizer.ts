import {
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
} from '@multimodal/agent-interface';
import { ToolResultContentPart } from '../types';
import {
  StandardPanelContent,
  SearchResult,
  CommandResult,
  FileResult,
} from '../types/panelContent';

interface MultimodalTextContent {
  type: 'text';
  text: string;
  name?: string;
  value?: unknown;
}

interface MultimodalImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

type MultimodalContent = MultimodalTextContent | MultimodalImageContent;

export function extractImageUrl(content: ChatCompletionContentPart[]): string | null {
  const imgPart = content.find(
    (part): part is ChatCompletionContentPartImage =>
      part?.type === 'image_url' && Boolean(part.image_url?.url),
  );

  return imgPart?.image_url.url || null;
}

export function isMultimodalContent(source: unknown): source is MultimodalContent[] {
  return (
    Array.isArray(source) &&
    source.length > 0 &&
    typeof source[0] === 'object' &&
    source[0] !== null &&
    'type' in source[0]
  );
}

export function isSearchResults(source: unknown): source is SearchResult[] {
  return (
    Array.isArray(source) &&
    source.length > 0 &&
    typeof source[0] === 'object' &&
    source[0] !== null &&
    'title' in source[0] &&
    'url' in source[0]
  );
}

export function isCommandResult(source: unknown): source is CommandResult {
  return (
    source !== null &&
    typeof source === 'object' &&
    ('command' in source || 'output' in source || 'stdout' in source)
  );
}

export function isFileResult(source: unknown): source is FileResult {
  return source !== null && typeof source === 'object' && ('path' in source || 'content' in source);
}

export function parseImageContent(source: string): { mimeType: string; base64Data: string } | null {
  if (!source.startsWith('data:image/')) {
    return null;
  }

  const [mimeTypePrefix, base64Data] = source.split(',');
  if (!mimeTypePrefix || !base64Data) {
    return null;
  }

  const mimeType = mimeTypePrefix.split(':')[1]?.split(';')[0];
  if (!mimeType) {
    return null;
  }

  return { mimeType, base64Data };
}

export function extractSearchResults(source: MultimodalContent[]): {
  results: SearchResult[];
  query?: string;
} {
  const resultsItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'RESULTS',
  );
  const queryItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'QUERY',
  );

  if (!resultsItem?.text) {
    return { results: [] };
  }

  const resultBlocks = resultsItem.text.split('---').filter(Boolean);
  const results = resultBlocks.map((block): SearchResult => {
    const lines = block.trim().split('\n');
    const titleLine = lines[0] || '';
    const urlLine = lines[1] || '';
    const snippet = lines.slice(2).join('\n');

    const title = titleLine.replace(/^\[\d+\]\s*/, '').trim();
    const url = urlLine.replace(/^URL:\s*/, '').trim();

    return { title, url, snippet };
  });

  return {
    results,
    query: queryItem?.text,
  };
}

export function extractCommandResult(source: MultimodalContent[]): {
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
} {
  const commandItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'COMMAND',
  );
  const stdoutItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'STDOUT',
  );
  const stderrItem = source.find(
    (item): item is MultimodalTextContent =>
      item.type === 'text' && (item.name === 'STDERR' || item.name === 'ERROR'),
  );
  const exitCodeItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'EXIT_CODE',
  );

  return {
    command: commandItem?.text,
    stdout: stdoutItem?.text || '',
    stderr: stderrItem?.text || '',
    exitCode: exitCodeItem?.value as number | undefined,
  };
}

export function extractFileContent(source: MultimodalContent[]): {
  content?: string;
} {
  const textContent = source.find((part): part is MultimodalTextContent => part.type === 'text');

  return {
    content: textContent?.text,
  };
}

export function standardizeContent(panelContent: StandardPanelContent): ToolResultContentPart[] {
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

  // Handle file operations
  if (type === 'file' && toolArguments?.path) {
    const content = toolArguments.content || (typeof source === 'string' ? source : null);

    if (content) {
      return [
        {
          type: 'file_result',
          name: 'FILE_RESULT',
          path: toolArguments.path,
          content,
        },
      ];
    }

    if (isMultimodalContent(source)) {
      const { content: extractedContent } = extractFileContent(source);
      if (extractedContent) {
        return [
          {
            type: 'file_result',
            name: 'FILE_RESULT',
            path: toolArguments.path,
            content: extractedContent,
          },
        ];
      }
    }
  }

  // Handle browser vision control
  if (type === 'browser_vision_control') {
    const environmentImage = Array.isArray(panelContent.originalContent)
      ? extractImageUrl(panelContent.originalContent)
      : null;

    return [
      {
        type: 'browser_control',
        name: 'BROWSER_CONTROL',
        toolCallId: panelContent.toolCallId,
        thought: toolArguments?.thought || '',
        step: toolArguments?.step || '',
        action: toolArguments?.action || '',
        status: isCommandResult(source) ? source.command || 'unknown' : 'unknown',
        environmentImage,
      },
    ];
  }

  // Handle image content
  if (
    Array.isArray(source) &&
    source.some(
      (part): part is MultimodalImageContent =>
        part?.type === 'image_url' && Boolean(part.image_url?.url),
    )
  ) {
    const imagePart = source.find(
      (part): part is MultimodalImageContent => part?.type === 'image_url',
    );

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

  // Handle different content types
  switch (type) {
    case 'image': {
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
      return [
        {
          type: 'text',
          text: 'Image could not be displayed',
        },
      ];
    }

    case 'search': {
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
            query: toolArguments?.query || title?.replace(/^Search: /i, ''),
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

      if (source && typeof source === 'object' && 'results' in source) {
        return [
          {
            type: 'search_result',
            name: 'SEARCH_RESULTS',
            results: source.results as SearchResult[],
            query: (source as { query?: string }).query,
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

    case 'command': {
      if (isMultimodalContent(source)) {
        const commandResult = extractCommandResult(source);
        return [
          {
            type: 'command_result',
            name: 'COMMAND_RESULT',
            command: commandResult.command || toolArguments?.command,
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
            command: source.command || toolArguments?.command,
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

    case 'browser': {
      return [
        {
          type: 'json',
          name: title || 'BROWSER_DATA',
          data: source,
          _extra,
        },
      ];
    }

    case 'file':
    case 'read_file':
    case 'write_file': {
      if (isMultimodalContent(source)) {
        const { content } = extractFileContent(source);
        if (content) {
          return [
            {
              type: 'file_result',
              name: 'FILE_RESULT',
              path: toolArguments?.path || 'Unknown file',
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
            path: source.path || toolArguments?.path || 'Unknown file',
            content: source.content || 'No content available',
          },
        ];
      }

      if (typeof source === 'string') {
        return [
          {
            type: 'file_result',
            name: 'FILE_RESULT',
            path: toolArguments?.path || 'Unknown file',
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

    default: {
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
  }
}
