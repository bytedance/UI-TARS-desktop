/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLogger } from '@tarko/agent';
import type {
  ClientConfig,
  ApiResponse,
  ShellExecParams,
  ShellExecResponse,
  ShellKillParams,
  ShellViewParams,
  ShellViewResponse,
  JupyterExecuteParams,
  FileEditorParams,
  FileListParams,
  FileListResp,
  CDPVersionResp,
} from './types';

export class AioClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private logger = getLogger('AioClient');

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.retries = config.retries || 1;
    this.retryDelay = config.retryDelay || 1000; // 1 second default
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async base<T>(path: string, options: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/${path.replace(/^\//, '')}`;
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt + 1} for ${path}`);

        const response = await this.fetchWithTimeout(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        });

        if (!response.ok) {
          let extra = '';

          if (response.headers.get('content-type') === 'application/json') {
            const body = (await response.json()) as ApiResponse<T>;
            extra = body.message;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}  ${extra}`);
        }

        const result = (await response.json()) as ApiResponse<T>;
        this.logger.debug(`Success for ${path}:`, result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Attempt ${attempt + 1} failed for ${path}:`, lastError.message);

        if (attempt < this.retries) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    this.logger.error(`All attempts failed for ${path}:`, lastError!);
    throw lastError!;
  }

  /**
   * Execute shell command
   */
  async shellExec(params: ShellExecParams): Promise<ApiResponse<ShellExecResponse>> {
    return this.base<ShellExecResponse>('/v1/shell/exec', {
      method: 'POST',
      body: JSON.stringify({
        async_mode: false,
        ...params,
      }),
    });
  }

  /**
   * View shell session
   */
  async shellView(params: ShellViewParams): Promise<ApiResponse<ShellViewResponse>> {
    return this.base<ShellViewResponse>('/v1/shell/view', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Kill shell session
   */
  async shellKill(params: ShellKillParams): Promise<ApiResponse<string>> {
    return this.base<string>('/v1/shell/kill', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Execute Jupyter code
   */
  async jupyterExecute(params: JupyterExecuteParams): Promise<ApiResponse<string>> {
    const requestParams = {
      ...params,
      kernel_name: params.kernel_name || 'python3',
      timeout: params.timeout || 30,
    };

    return this.base<string>('/v1/jupyter/execute', {
      method: 'POST',
      body: JSON.stringify(requestParams),
    });
  }

  /**
   * File editor operations
   */
  async fileEditor(params: FileEditorParams): Promise<ApiResponse<string>> {
    return this.base<string>('/v1/file/str_replace_editor', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * View shell session
   */
  async fileDownload(params: { path: string }): Promise<ApiResponse<ShellViewResponse>> {
    return this.base<ShellViewResponse>('/v1/file/download', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async fileList({
    path,
    sort_by = 'name',
    file_types = ['string'],
    recursive = false,
    show_hidden = false,
    sort_desc = false,
    include_permissions = false,
    include_size = true,
  }: FileListParams): Promise<ApiResponse<FileListResp>> {
    return this.base<FileListResp>('/v1/file/list', {
      method: 'POST',
      body: JSON.stringify({
        path,
        sort_by,
        sort_desc,
        file_types,
        recursive,
        show_hidden,
        include_permissions,
        include_size,
      }),
    });
  }

  async cdpVersion(): Promise<ApiResponse<CDPVersionResp>> {
    return this.base<CDPVersionResp>('/cdp/json/version', {
      method: 'GET',
    });
  }

  /**
   * Execute shell command with async polling and timeout management
   * @param params Shell execution parameters
   * @param maxWaitTime Maximum wait time in milliseconds (default: 10 minutes)
   * @param pollInterval Polling interval in milliseconds (default: 2 seconds)
   */
  async shellExecWithPolling(
    params: Omit<ShellExecParams, 'async_mode'>,
    maxWaitTime = 10 * 60 * 1000, // 10 minutes
    pollInterval = 1000, // 1s
  ): Promise<ApiResponse<ShellExecResponse>> {
    // Start async execution
    const execResult = await this.shellExec({
      ...params,
      async_mode: true,
    });

    if (!execResult.success) {
      return execResult;
    }

    const sessionId = execResult.data.session_id;
    const startTime = Date.now();

    this.logger.info(`Started async execution for session ${sessionId}, polling for completion...`);

    // Poll for completion
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const viewResult = await this.shellView({ id: sessionId });

        if (!viewResult.success) {
          this.logger.warn(`Failed to view session ${sessionId}:`, viewResult.message);
          await this.sleep(pollInterval);
          continue;
        }

        // Check if command is completed (you may need to adjust this logic based on actual API behavior)
        const isFinished = viewResult?.data?.status === 'completed';

        // If there's output or the status indicates completion, return the result
        if (isFinished) {
          this.logger.info(`Command completed for session ${sessionId}`);

          // There is a problem with the view interface return in exec asynchronous mode.
          // console[number].output is always empty, and you need to manually get the value from data.output.
          const consoleData = viewResult.data.console;

          if (consoleData[0] && !consoleData[0]?.output) {
            consoleData[0].output = viewResult.data.output;
          }

          return {
            success: true,
            message: 'Command completed successfully',
            data: {
              session_id: sessionId,
              command: params.command,
              status: 'completed',
              returncode: 0, // Assume success if we have output
              output: viewResult.data.output,
              console: consoleData,
            },
          };
        }

        // Wait before next poll
        await this.sleep(pollInterval);
      } catch (error) {
        this.logger.warn(`Error polling session ${sessionId}:`, error);
        await this.sleep(pollInterval);
      }
    }

    // Timeout reached, kill the session
    this.logger.warn(`Timeout reached for session ${sessionId}, killing session...`);

    try {
      await this.shellKill({ id: sessionId });
      this.logger.info(`Session ${sessionId} killed due to timeout`);
    } catch (killError) {
      this.logger.error(`Failed to kill session ${sessionId}:`, killError);
    }

    throw new Error(`Command execution timed out after ${maxWaitTime}ms`);
  }
}
