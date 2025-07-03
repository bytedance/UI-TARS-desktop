import { ChatCompletionContentPart } from '@multimodal/agent-interface';

export interface MultimodalTextContent {
  type: 'text';
  text: string;
  name?: string;
  value?: unknown;
}

export interface MultimodalImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export type MultimodalContent = MultimodalTextContent | MultimodalImageContent;

export interface ImageContentData {
  mimeType: string;
  base64Data: string;
}

export interface SearchResultData {
  results: SearchResult[];
  query?: string;
}

export interface CommandResultData {
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface FileContentData {
  content?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  content?: string;
}

export interface CommandResult {
  command?: string;
  output?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface FileResult {
  path?: string;
  content?: string;
}

export interface ScriptResultData {
  script?: string;
  interpreter?: string;
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface ScriptResult {
  script?: string;
  interpreter?: string;
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}
