export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ShellExecParams {
  id?: string;
  exec_dir?: string;
  command: string;
  async_mode?: boolean;
}

export interface ShellExecResponse {
  session_id: string;
  command: string;
  status: string;
  returncode: number | null;
  output: string | null;
  console: Array<{
    ps1: string;
    command: string;
    output: string;
  }>;
}

export interface ShellViewParams {
  id: string;
}

export interface ShellViewResponse {
  output: string;
  session_id: string;
  status: string;
  console: Array<{
    ps1: string;
    command: string;
    output: string;
  }>;
}

export interface ShellKillParams {
  id: string;
}

export interface JupyterExecuteParams {
  code: string;
  timeout?: number;
  kernel_name?: string;
}

export interface FileEditorParams {
  command: string;
  path: string;
  file_text?: string;
  old_str?: string;
  new_str?: string;
  insert_line?: number;
  view_range?: number[];
}

export interface FileListParams {
  path: string;
  recursive: boolean;
  show_hidden: boolean;
  file_types: string[];
  max_depth: number;
  include_size: boolean;
  include_permissions: boolean;
  sort_by: string;
  sort_desc: boolean;
}

export interface FileListResp {
  path: string;
  files: Array<{
    name: string;
    path: string;
    is_directory: boolean;
    size?: unknown;
    modified_time: string;
    permissions?: unknown;
    extension?: unknown;
  }>;
  total_count: number;
  directory_count: number;
  file_count: number;
}

export interface ClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface CDPVersionResp {
  Browser: string;
  'Protocol-Version': string;
  'User-Agent': string;
  'V8-Version': string;
  'WebKit-Version': string;
  webSocketDebuggerUrl: string;
}
