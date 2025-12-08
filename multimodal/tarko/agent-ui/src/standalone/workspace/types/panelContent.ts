import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { FileDisplayMode } from '../types';

export interface PanelContentSource {
  [key: string]: any;
}

export interface PanelContentArguments {
  path?: string;
  content?: string;
  query?: string;
  command?: string;
  thought?: string;
  step?: string;
  action?: string;
  [key: string]: unknown;
}

export interface PanelContentExtra {
  currentScreenshot?: string;
  [key: string]: unknown;
}

export interface StandardPanelContent {
  type: string;
  source?: string | PanelContentSource | ChatCompletionContentPart[];
  title?: string;
  link?: string;
  timestamp?: number;
  toolCallId?: string;
  error?: string;
  arguments?: PanelContentArguments;
  _extra?: PanelContentExtra;
  isStreaming?: boolean;
  environmentId?: string;
}

export interface ZoomedImageData {
  src: string;
  alt?: string;
}

export interface FullscreenFileData {
  content: string;
  fileName: string;
  filePath: string;
  displayMode: FileDisplayMode;
  isMarkdown: boolean;
  isHtml?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  content?: string;
  snippet?: string;
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
