/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIOComputer } from '../src/AIOComputer';
import type { AIOAction, AIOHybridOptions } from '../src/types';
import { AioClient } from '@agent-infra/sandbox';

// Mock the AioClient from @agent-infra/sandbox
vi.mock('@agent-infra/sandbox', () => ({
  AioClient: vi.fn().mockImplementation(() => ({
    browserActions: vi.fn(),
    browserScreenshot: vi.fn(),
  })),
}));

// 使用环境变量
const testConfig = {
  baseURL: process.env.AIO_BASE_URL || 'http://localhost:8080',
  timeout: parseInt(process.env.AIO_TIMEOUT || '5000'),
};

describe('AIOComputer', () => {
  let aioComputer: AIOComputer;
  let mockAioClient: any;
  const mockOptions: AIOHybridOptions = {
    baseURL: testConfig.baseURL,
    timeout: testConfig.timeout,
    headers: {
      Authorization: 'Bearer test-token',
    },
  };

  beforeEach(() => {
    aioComputer = new AIOComputer(mockOptions);
    // Get the mocked AioClient instance
    mockAioClient = (AioClient as any).mock.results[0].value;
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
      mockAioClient.browserScreenshot.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('image/png'),
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
      });

      const result = await aioComputer.screenshot();

      expect(mockAioClient.browserScreenshot).toHaveBeenCalledWith({
        timeout: testConfig.timeout,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
      });

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
      mockAioClient.browserScreenshot.mockResolvedValueOnce({
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
      mockAioClient.browserScreenshot.mockRejectedValueOnce(
        new Error('HTTP 500: Internal Server Error'),
      );

      const result = await aioComputer.screenshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('HTTP 500: Internal Server Error');
    });

    it('should handle network error', async () => {
      mockAioClient.browserScreenshot.mockRejectedValueOnce(new Error('Network error'));

      const result = await aioComputer.screenshot();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('mouse actions', () => {
    beforeEach(() => {
      mockAioClient.browserActions.mockResolvedValue({ success: true });
    });

    it('should move mouse to position', async () => {
      const result = await aioComputer.moveTo(100, 200);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'MOVE_TO',
          x: 100,
          y: 200,
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should click at position', async () => {
      const result = await aioComputer.click(100, 200, 'left', 1);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'CLICK',
          x: 100,
          y: 200,
          button: 'left',
          num_clicks: 1,
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should click without optional parameters', async () => {
      const result = await aioComputer.click();

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'CLICK',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform mouse down', async () => {
      const result = await aioComputer.mouseDown('left');

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'MOUSE_DOWN',
          button: 'left',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform mouse up', async () => {
      const result = await aioComputer.mouseUp('left');

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'MOUSE_UP',
          button: 'left',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform right click', async () => {
      const result = await aioComputer.rightClick(100, 200);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'RIGHT_CLICK',
          x: 100,
          y: 200,
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform double click', async () => {
      const result = await aioComputer.doubleClick(100, 200);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'DOUBLE_CLICK',
          x: 100,
          y: 200,
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform drag to', async () => {
      const result = await aioComputer.dragTo(300, 400);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'DRAG_TO',
          x: 300,
          y: 400,
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform scroll', async () => {
      const result = await aioComputer.scroll(10, -20);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'SCROLL',
          dx: 10,
          dy: -20,
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });
  });

  describe('keyboard actions', () => {
    beforeEach(() => {
      mockAioClient.browserActions.mockResolvedValue({ success: true });
    });

    it('should type text', async () => {
      const result = await aioComputer.type('Hello World');

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'TYPING',
          text: 'Hello World',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should press key', async () => {
      const result = await aioComputer.press('Enter');

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'PRESS',
          key: 'Enter',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform key down', async () => {
      const result = await aioComputer.keyDown('Shift');

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'KEY_DOWN',
          key: 'Shift',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform key up', async () => {
      const result = await aioComputer.keyUp('Shift');

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'KEY_UP',
          key: 'Shift',
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });

    it('should perform hotkey combination', async () => {
      const result = await aioComputer.hotkey(['Ctrl', 'C']);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(
        {
          action_type: 'HOTKEY',
          keys: ['ctrl', 'c'],
        },
        {
          timeout: testConfig.timeout,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        },
      );
      expect(result.success).toBe(true);
    });
  });

  describe('generic execute', () => {
    it('should execute custom action', async () => {
      mockAioClient.browserActions.mockResolvedValue({ success: true });

      const customAction = {
        action_type: 'CUSTOM_ACTION',
        customParam: 'value',
      };

      const result = await aioComputer.execute(customAction as unknown as AIOAction);

      expect(mockAioClient.browserActions).toHaveBeenCalledWith(customAction, {
        timeout: testConfig.timeout,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      mockAioClient.browserActions.mockRejectedValue(new Error('HTTP 404: Not Found'));

      const result = await aioComputer.click(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      mockAioClient.browserActions.mockRejectedValue(new Error('Network timeout'));

      const result = await aioComputer.click(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network timeout');
    });

    it('should handle unknown errors', async () => {
      mockAioClient.browserActions.mockRejectedValue('Unknown error');

      const result = await aioComputer.click(100, 200);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown error');
    });
  });
});
