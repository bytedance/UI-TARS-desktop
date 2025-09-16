/**
 * Renderer type definitions - each renderer handles a specific data format
 */
export type RendererType =
  | 'image'
  | 'link'
  | 'link_reader'
  | 'search_result'
  | 'command_result'
  | 'script_result'
  | 'browser_result'
  | 'browser_vision_control'
  | 'plan'
  | 'research_report'
  | 'json'
  | 'deliverable'
  | 'file_result'
  | 'diff_result'
  | 'tabbed_files';

/**
 * Standard data format for all panel content
 * Each renderer receives this standardized format
 */
export interface StandardToolResult {
  /** Renderer type determines which component to use */
  type: RendererType;
  /** Standardized content data specific to the renderer type */
  data: RendererData;
  /** Tool metadata */
  metadata: ToolMetadata;
}

/**
 * Tool metadata common to all renderers
 */
export interface ToolMetadata {
  toolName: string;
  toolCallId: string;
  timestamp: number;
  title: string;
  error?: string;
  isStreaming?: boolean;
  elapsedMs?: number;
  environmentId?: string;
  _extra?: { currentScreenshot?: string; [key: string]: unknown };
}

/**
 * Union type for all renderer-specific data formats
 */
export type RendererData =
  | ImageData
  | FileData
  | DiffData
  | CommandData
  | SearchData
  | BrowserData
  | TabbedFilesData
  | JsonData;

/**
 * Image renderer data
 */
export interface ImageData {
  type: 'image';
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

/**
 * File renderer data
 */
export interface FileData {
  type: 'file';
  path: string;
  content: string;
  language?: string;
  size?: number;
}

/**
 * Diff renderer data
 */
export interface DiffData {
  type: 'diff';
  path: string;
  oldContent: string;
  newContent: string;
  language?: string;
}

/**
 * Command result data
 */
export interface CommandData {
  type: 'command';
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

/**
 * Search result data
 */
export interface SearchData {
  type: 'search';
  query: string;
  results: SearchResultItem[];
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
  content?: string;
}

/**
 * Browser result data
 */
export interface BrowserData {
  type: 'browser';
  url?: string;
  screenshot?: string;
  action?: string;
  details?: Record<string, unknown>;
}

/**
 * Tabbed files data
 */
export interface TabbedFilesData {
  type: 'tabbed_files';
  files: Array<{
    path: string;
    content: string;
    language?: string;
  }>;
}

/**
 * Generic JSON data fallback
 */
export interface JsonData {
  type: 'json';
  content: unknown;
}

/**
 * Tool result transformer function type
 * Converts raw tool output to standardized format
 */
export type ToolResultTransformer = (
  toolName: string,
  content: unknown,
  args?: unknown,
  metadata?: Partial<ToolMetadata>,
) => StandardToolResult;

/**
 * Tool renderer configuration
 * Maps tool names to transformers
 */
export interface ToolRendererConfig {
  [toolName: string]: ToolResultTransformer;
}

/**
 * Content detection function type
 * Used for dynamic content-based renderer selection
 */
export type ContentDetector = (
  toolName: string,
  content: unknown,
  args?: unknown,
) => RendererType | null;
