export enum PlanTaskStatus {
  Todo = 'todo',
  Doing = 'doing',
  Done = 'done',
  Skipped = 'skipped',
}

export interface PlanTask {
  id: string;
  title: string;
  status: PlanTaskStatus;
  startedAt?: number;
  finishedAt?: number;
  cost?: number;
  error?: string;
}

export enum ActionStatus {
  Success = 'success',
  Failed = 'failed',
  Running = 'running',
}

export enum ToolCallType {
  ReadFile = 'read_file',
  WriteFile = 'write_file',
  ReadMultipleFiles = 'read_multiple_files',
  EditFile = 'edit_file',
  CreateDirectory = 'create_directory',
  ListDirectory = 'list_directory',
  DirectoryTree = 'directory_tree',
  MoveFile = 'move_file',
  SearchFiles = 'search_files',
  GetFileInfo = 'get_file_info',
  ListAllowedDirectories = 'list_allowed_directories',
  RunCommand = 'run_command',
  RunScript = 'run_script',
  WebSearch = 'web_search',
  BrowserNavigate = 'browser_navigate',
  BrowserScreenshot = 'browser_screenshot',
  BrowserClick = 'browser_click',
  BrowserFormInputFill = 'browser_form_input_fill',
  BrowserSelect = 'browser_select',
  BrowserHover = 'browser_hover',
  BrowserEvaluate = 'browser_evaluate',
  BrowserGetHtml = 'browser_get_html',
  BrowserGetText = 'browser_get_text',
  BrowserReadLinks = 'browser_read_links',
  BrowserScroll = 'browser_scroll',
  BrowserNewTab = 'browser_new_tab',
  BrowserCloseTab = 'browser_close_tab',
  BrowserSwitchTab = 'browser_switch_tab',
  ChatMessage = 'chat_message',
}

export interface ToolCallParam {
  [ToolCallType.ReadFile]: {
    path: string;
  };
  [ToolCallType.ChatMessage]: {
    attachments?: { path: string }[];
  };
  [ToolCallType.WriteFile]: {
    path: string;
    content: string;
  };
  [ToolCallType.ReadMultipleFiles]: {
    paths: string[];
  };
  [ToolCallType.EditFile]: {
    path: string;
    edits: Array<{
      oldText: string;
      newText: string;
    }>;
    dryRun?: boolean;
  };
  [ToolCallType.CreateDirectory]: {
    path: string;
  };
  [ToolCallType.ListDirectory]: {
    path: string;
  };
  [ToolCallType.DirectoryTree]: {
    path: string;
  };
  [ToolCallType.MoveFile]: {
    source: string;
    destination: string;
  };
  [ToolCallType.SearchFiles]: {
    path: string;
    pattern: string;
    excludePatterns?: string[];
  };
  [ToolCallType.GetFileInfo]: {
    path: string;
  };
  [ToolCallType.ListAllowedDirectories]: Record<string, never>;

  [ToolCallType.RunCommand]: {
    command: string;
    cwd?: string;
  };
  [ToolCallType.RunScript]: {
    interpreter: string;
    script: string;
    cwd?: string;
  };
  [ToolCallType.WebSearch]: {
    query: string;
  };
  [ToolCallType.BrowserNavigate]: {
    url: string;
  };
  [ToolCallType.BrowserScreenshot]: {
    name: string;
    selector?: string;
    width?: number;
    height?: number;
  };
  [ToolCallType.BrowserClick]: {
    selector: string;
  };
  [ToolCallType.BrowserFormInputFill]: {
    selector: string;
    value: string;
  };
  [ToolCallType.BrowserSelect]: {
    selector: string;
    value: string;
  };
  [ToolCallType.BrowserHover]: {
    selector: string;
  };
  [ToolCallType.BrowserEvaluate]: {
    script: string;
  };
  [ToolCallType.BrowserGetHtml]: Record<string, never>;
  [ToolCallType.BrowserGetText]: Record<string, never>;
  [ToolCallType.BrowserReadLinks]: Record<string, never>;
  [ToolCallType.BrowserScroll]: {
    amount: number;
  };
  [ToolCallType.BrowserNewTab]: {
    url: string;
  };
  [ToolCallType.BrowserCloseTab]: Record<string, never>;
  [ToolCallType.BrowserSwitchTab]: {
    index: number;
  };
}

export interface ToolCallMeta {
  type: ToolCallType;
  param: ToolCallParam[ToolCallType];
}

export function isToolCallType<T extends ToolCallType>(
  toolName: string,
  expectedType: T,
): toolName is T {
  return toolName === expectedType;
}

export type ToolCallParamFor<T extends ToolCallType> = ToolCallParam[T];

export enum ToolPlatform {
  FileSystem = 'file system',
  CommandLine = 'ternimal',
  Search = 'search engine',
  System = 'system',
  Browser = 'browser',
}

export const toolToPlatformMap: Record<string, ToolPlatform> = {
  read_file: ToolPlatform.FileSystem,
  write_file: ToolPlatform.FileSystem,
  read_multiple_files: ToolPlatform.FileSystem,
  edit_file: ToolPlatform.FileSystem,
  create_directory: ToolPlatform.FileSystem,
  list_directory: ToolPlatform.FileSystem,
  directory_tree: ToolPlatform.FileSystem,
  move_file: ToolPlatform.FileSystem,
  search_files: ToolPlatform.FileSystem,
  get_file_info: ToolPlatform.FileSystem,
  list_allowed_directories: ToolPlatform.FileSystem,
  run_command: ToolPlatform.CommandLine,
  run_script: ToolPlatform.CommandLine,
  web_search: ToolPlatform.Search,
  browser_navigate: ToolPlatform.Browser,
  browser_screenshot: ToolPlatform.Browser,
  browser_click: ToolPlatform.Browser,
  browser_form_input_fill: ToolPlatform.Browser,
  browser_select: ToolPlatform.Browser,
  browser_hover: ToolPlatform.Browser,
  browser_evaluate: ToolPlatform.Browser,
  browser_get_html: ToolPlatform.Browser,
  browser_get_text: ToolPlatform.Browser,
  browser_read_links: ToolPlatform.Browser,
  browser_scroll: ToolPlatform.Browser,
  browser_new_tab: ToolPlatform.Browser,
  browser_close_tab: ToolPlatform.Browser,
  browser_switch_tab: ToolPlatform.Browser,
};
