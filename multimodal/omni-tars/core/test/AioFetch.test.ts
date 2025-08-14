/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AioClient } from '../src/utils/aio';
import type {
  ClientConfig,
  ShellExecParams,
  ShellViewParams,
  ShellKillParams,
  JupyterExecuteParams,
  FileEditorParams,
  FileListParams,
} from '../src/utils/types';

// Mock logger
vi.mock('@tarko/agent', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AioClient', () => {
  let client: AioClient;
  let config: ClientConfig;

  beforeEach(() => {
    config = { baseUrl: 'http://localhost:8080', timeout: 5000, retries: 2, retryDelay: 500 };
    client = new AioClient(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('The configuration should be initialized correctly', () => {
      expect(client['baseUrl']).toBe('http://localhost:8080');
      expect(client['timeout']).toBe(5000);
      expect(client['retries']).toBe(2);
      expect(client['retryDelay']).toBe(500);
    });

    it('The slash at the end of baseUrl should be removed', () => {
      const clientWithSlash = new AioClient({ baseUrl: 'http://localhost:8080/' });
      expect(clientWithSlash['baseUrl']).toBe('http://localhost:8080');
    });

    it('Default value should be used', () => {
      const clientWithDefaults = new AioClient({ baseUrl: 'http://localhost:8080' });
      expect(clientWithDefaults['timeout']).toBe(30000);
      expect(clientWithDefaults['retries']).toBe(1);
      expect(clientWithDefaults['retryDelay']).toBe(1000);
    });
  });

  describe('shellExec', () => {
    it('The correct shell execution request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'OK',
        data: {
          session_id: 'test-session',
          command: 'ls -la',
          status: 'completed',
          returncode: 0,
          output: 'file1.txt',
          console: [],
        },
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: ShellExecParams = { command: 'ls -la', exec_dir: '/tmp' };
      const result = await client.shellExec(params);

      expect(result).toEqual(mockResponseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/shell/exec',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ async_mode: false, command: 'ls -la', exec_dir: '/tmp' }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  describe('shellView', () => {
    it('The correct shell view request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'OK',
        data: {
          output: 'command output',
          session_id: 'test-session',
          status: 'completed',
          console: [],
        },
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: ShellViewParams = { id: 'test-session' };
      const result = await client.shellView(params);

      expect(result).toEqual(mockResponseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/shell/view',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(params),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  describe('shellKill', () => {
    it('The correct shell termination request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'Session killed',
        data: 'Session terminated',
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: ShellKillParams = { id: 'test-session' };
      const result = await client.shellKill(params);

      expect(result).toEqual(mockResponseData);
    });
  });

  describe('jupyterExecute', () => {
    it('The correct Jupyter execution request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'Code executed',
        data: 'Execution result',
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: JupyterExecuteParams = {
        code: 'print("Hello World")',
        timeout: 60,
        kernel_name: 'python3',
      };
      const result = await client.jupyterExecute(params);

      expect(result).toEqual(mockResponseData);
    });

    it('Default parameters should be used', async () => {
      const mockResponseData = {
        success: true,
        message: 'Code executed',
        data: 'Execution result',
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: JupyterExecuteParams = { code: 'print("Hello")' };
      await client.jupyterExecute(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/jupyter/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'print("Hello")', kernel_name: 'python3', timeout: 30 }),
        }),
      );
    });
  });

  describe('fileEditor', () => {
    it('The correct file editing request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'File edited',
        data: 'File content updated',
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: FileEditorParams = {
        command: 'str_replace',
        path: '/tmp/test.txt',
        old_str: 'old text',
        new_str: 'new text',
      };

      const result = await client.fileEditor(params);
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('fileDownload', () => {
    it('The correct file download request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'File downloaded',
        data: {
          output: 'file content',
          session_id: 'download-session',
          status: 'completed',
          console: [],
        },
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await client.fileDownload({ path: '/tmp/test.txt' });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('fileList', () => {
    it('The correct file list request should be sent', async () => {
      const mockResponseData = {
        success: true,
        message: 'Files listed',
        data: {
          path: '/tmp',
          files: [
            {
              name: 'test.txt',
              path: '/tmp/test.txt',
              is_directory: false,
              size: 1024,
              modified_time: '2023-01-01T00:00:00Z',
            },
          ],
          total_count: 1,
          directory_count: 0,
          file_count: 1,
        },
      };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockResponseData) };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const params: FileListParams = {
        path: '/tmp',
        recursive: false,
        show_hidden: false,
        file_types: ['string'],
        max_depth: 1,
        include_size: true,
        include_permissions: false,
        sort_by: 'name',
        sort_desc: false,
      };

      const result = await client.fileList(params);
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('shellExecWithPolling', () => {
    it('Polling should be done until the command is completed', async () => {
      // Mock initial async execution
      const execMockData = {
        success: true,
        message: 'Started',
        data: {
          session_id: 'test-session',
          command: 'long-command',
          status: 'running',
          returncode: null,
          output: null,
          console: [],
        },
      };

      // Mock view responses - first running, then completed
      const viewMockDataRunning = {
        success: true,
        message: 'OK',
        data: { output: '', session_id: 'test-session', status: 'running', console: [] },
      };

      const viewMockDataCompleted = {
        success: true,
        message: 'OK',
        data: {
          output: 'command completed',
          session_id: 'test-session',
          status: 'completed',
          console: [],
        },
      };

      const mockExecResponse = { ok: true, json: vi.fn().mockResolvedValue(execMockData) };
      const mockViewResponse1 = { ok: true, json: vi.fn().mockResolvedValue(viewMockDataRunning) };
      const mockViewResponse2 = {
        ok: true,
        json: vi.fn().mockResolvedValue(viewMockDataCompleted),
      };

      mockFetch
        .mockResolvedValueOnce(mockExecResponse as unknown as Response)
        .mockResolvedValueOnce(mockViewResponse1 as unknown as Response)
        .mockResolvedValueOnce(mockViewResponse2 as unknown as Response);

      const params = { command: 'long-command', exec_dir: '/tmp' };
      const result = await client.shellExecWithPolling(params, 4000, 100);

      expect(result.success).toBe(true);
      expect(result.data.session_id).toBe('test-session');
      expect(result.data.output).toBe('command completed');
      expect(mockFetch).toHaveBeenCalledTimes(3); // exec + 2 views
    });

    it('The session should be terminated when timeout', async () => {
      const execMockData = {
        success: true,
        message: 'Started',
        data: {
          session_id: 'test-session',
          command: 'long-command',
          status: 'running',
          returncode: null,
          output: null,
          console: [],
        },
      };

      const viewMockDataRunning = {
        success: true,
        message: 'OK',
        data: { output: '', session_id: 'test-session', status: 'running', console: [] },
      };

      const killMockData = { success: true, message: 'Killed', data: 'Session terminated' };

      const mockExecResponse = { ok: true, json: vi.fn().mockResolvedValue(execMockData) };
      const mockViewResponse = { ok: true, json: vi.fn().mockResolvedValue(viewMockDataRunning) };
      const mockKillResponse = { ok: true, json: vi.fn().mockResolvedValue(killMockData) };

      mockFetch
        .mockResolvedValueOnce(mockExecResponse as unknown as Response)
        .mockResolvedValue(mockViewResponse as unknown as Response)
        .mockResolvedValueOnce(mockKillResponse as unknown as Response);

      const params = { command: 'long-command', exec_dir: '/tmp' };

      await expect(client.shellExecWithPolling(params, 200, 50)).rejects.toThrow(
        'Command execution timed out after 200ms',
      );
    });
  });

  describe('Error handling', () => {
    it('An exception should be thrown in an HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        async json() {
          return { message: 'err detail' };
        },
        headers: {
          get(type: string) {
            if (type === 'content-type') {
              return 'application/json';
            }
          },
        },
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(client.shellExec({ command: 'test' })).rejects.toThrow('HTTP 404: Not Found');
    });

    it('Should try again when the network error is', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockRejectedValue(error);

      await expect(client.shellExec({ command: 'test' })).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });
  });

  describe('Private method', () => {
    describe('sleep', () => {
      it('Should wait for the specified number of milliseconds', async () => {
        const start = Date.now();
        await client['sleep'](100);
        const end = Date.now();
        expect(end - start).toBeGreaterThanOrEqual(90);
      });
    });
  });
});
