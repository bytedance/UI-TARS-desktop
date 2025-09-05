/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIOComputer } from '../src/AIOComputer';
import type { AIOAction, AIOHybridOptions } from '../src/types';

// 使用环境变量
const testConfig = {
  baseURL: process.env.AIO_BASE_URL || 'http://localhost:8080',
  timeout: parseInt(process.env.AIO_TIMEOUT || '5000'),
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout
vi.stubGlobal('AbortSignal', {
  timeout: vi.fn(() => ({})),
});

describe('AIOComputer', () => {
  let aioComputer: AIOComputer;
  const mockOptions: AIOHybridOptions = {
    baseURL: testConfig.baseURL,
    timeout: testConfig.timeout,
    headers: {
      Authorization: 'Bearer test-token',
    },
  };

  beforeEach(() => {
    aioComputer = new AIOComputer(mockOptions);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct options', () => {
      expect(aioComputer).toBeInstanceOf(AIOComputer);
    });

    it('should remove trailing slash from baseURL', () => {
      const computerWithSlash = new AIOComputer({
        ...mockOptions,
        baseURL: 'http://localhost:8080/',
      });
      expect(computerWithSlash).toBeInstanceOf(AIOComputer);
    });
  });

  describe('screenshot', () => {
    it('should take screenshot successfully with image response', async () => {
      const mockImageData = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('image/png'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
      });

      const result = await aioComputer.screenshot();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/screenshot',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('base64');
      expect(result.data).toHaveProperty('scaleFactor', 1);
      expect(result.data).toHaveProperty('contentType', 'image/png');
    });

    it('should take screenshot successfully with JSON response', async () => {
      const mockJsonData = {
        base64: 'mock-base64-data',
        scaleFactor: 2,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockJsonData),
      });

      const result = await aioComputer.screenshot();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockJsonData);
    });

    it('should handle screenshot failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await aioComputer.screenshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('HTTP 500: Internal Server Error');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await aioComputer.screenshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('mouse actions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should move mouse to position', async () => {
      const result = await aioComputer.moveTo(100, 200);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action_type: 'MOVE_TO',
            x: 100,
            y: 200,
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should click at position', async () => {
      const result = await aioComputer.click(100, 200, 'left', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'CLICK',
            x: 100,
            y: 200,
            button: 'left',
            num_clicks: 1,
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should click without optional parameters', async () => {
      const result = await aioComputer.click();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'CLICK',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform mouse down', async () => {
      const result = await aioComputer.mouseDown('left');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'MOUSE_DOWN',
            button: 'left',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform mouse up', async () => {
      const result = await aioComputer.mouseUp('left');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'MOUSE_UP',
            button: 'left',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform right click', async () => {
      const result = await aioComputer.rightClick(100, 200);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'RIGHT_CLICK',
            x: 100,
            y: 200,
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform double click', async () => {
      const result = await aioComputer.doubleClick(100, 200);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'DOUBLE_CLICK',
            x: 100,
            y: 200,
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform drag to', async () => {
      const result = await aioComputer.dragTo(300, 400);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'DRAG_TO',
            x: 300,
            y: 400,
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform scroll', async () => {
      const result = await aioComputer.scroll(10, -20);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'SCROLL',
            dx: 10,
            dy: -20,
          }),
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('keyboard actions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('should type text', async () => {
      const result = await aioComputer.type('Hello World');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'TYPING',
            text: 'Hello World',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should press key', async () => {
      const result = await aioComputer.press('Enter');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'PRESS',
            key: 'Enter',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform key down', async () => {
      const result = await aioComputer.keyDown('Shift');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'KEY_DOWN',
            key: 'Shift',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform key up', async () => {
      const result = await aioComputer.keyUp('Shift');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'KEY_UP',
            key: 'Shift',
          }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should perform hotkey combination', async () => {
      const result = await aioComputer.hotkey(['Ctrl', 'C']);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify({
            action_type: 'HOTKEY',
            keys: ['ctrl', 'c'],
          }),
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('generic execute', () => {
    it('should execute custom action', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      const customAction = {
        action_type: 'CUSTOM_ACTION',
        customParam: 'value',
      };

      const result = await aioComputer.execute(customAction as unknown as AIOAction);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/browser/actions',
        expect.objectContaining({
          body: JSON.stringify(customAction),
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await aioComputer.click(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await aioComputer.click(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValue('Unknown error');

      const result = await aioComputer.click(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown error');
    });
  });
});
