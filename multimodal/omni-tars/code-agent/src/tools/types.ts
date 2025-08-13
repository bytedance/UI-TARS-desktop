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

export interface ClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}
