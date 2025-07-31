import {
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
} from '@multimodal/agent-interface';
import {
  MultimodalContent,
  MultimodalTextContent,
  MultimodalImageContent,
  ImageContentData,
  SearchResultData,
  CommandResultData,
  ScriptResultData,
  FileContentData,
  SearchResult,
} from './types';

export function extractImageUrl(content: ChatCompletionContentPart[]): string | null {
  const imgPart = content.find(
    (part): part is ChatCompletionContentPartImage =>
      part?.type === 'image_url' && Boolean(part.image_url?.url),
  );

  return imgPart?.image_url.url || null;
}

export function parseImageContent(source: string): ImageContentData | null {
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

export function extractSearchResults(source: MultimodalContent[]): SearchResultData {
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

export function extractCommandResult(source: MultimodalContent[]): CommandResultData {
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

export function extractScriptResult(source: MultimodalContent[]): ScriptResultData {
  const errorItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'ERROR',
  );
  const stderrItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'STDERR',
  );
  const stdoutItem = source.find(
    (item): item is MultimodalTextContent => item.type === 'text' && item.name === 'STDOUT',
  );

  return {
    stdout: stdoutItem?.text || '',
    stderr: errorItem?.text || stderrItem?.text || '',
    exitCode: 1, // Script failures typically have exit code 1
  };
}

export function extractFileContent(source: MultimodalContent[]): FileContentData {
  const textContent = source.find((part): part is MultimodalTextContent => part.type === 'text');

  return {
    content: textContent?.text,
  };
}

export function findImageContent(source: MultimodalContent[]): MultimodalImageContent | null {
  return (
    source.find(
      (part): part is MultimodalImageContent =>
        part?.type === 'image_url' && Boolean(part.image_url?.url),
    ) || null
  );
}
