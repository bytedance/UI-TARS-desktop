/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UITarsModel } from '../src/Model';

// Mock OpenAI
const mockCreate = vi.fn();
const mockResponsesCreate = vi.fn();
const mockResponsesDelete = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    responses: {
      create: mockResponsesCreate,
      delete: mockResponsesDelete,
    },
  })),
}));

// Mock context
vi.mock('../src/context/useContext', () => ({
  useContext: () => ({
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
    signal: undefined,
  }),
}));

vi.mock('../src/utils', async () => {
  const actual = await vi.importActual('../src/utils');
  return {
    ...actual,
    preprocessResizeImage: vi
      .fn()
      .mockImplementation((image) => Promise.resolve(image)),
  };
});

describe('UITarsModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ChatCompletion API', () => {
    it('should send all messages for ChatCompletion API', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: false,
      });

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'test response' } }],
        usage: { total_tokens: 100 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + user instruction' },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1', 'base64image2'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          messages: [
            { role: 'user', content: 'System prompt + user instruction' },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: 'data:image/png;base64,base64image1' },
                },
              ],
            },
            {
              role: 'assistant',
              content: 'Action: click(point="<point>615 754</point>")',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: 'data:image/png;base64,base64image2' },
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });
  });

  describe('Response API', () => {
    it('should send all messages for Response API (first call)', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate.mockResolvedValue({
        id: 'response-1',
        output_text: 'test response',
        usage: { total_tokens: 50 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + user instruction' },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          input: [
            { role: 'user', content: 'System prompt + user instruction' },
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,base64image1',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should send incremental messages for Response API (subsequent call)', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate.mockResolvedValue({
        id: 'response-2',
        output_text: 'test response 2',
        usage: { total_tokens: 60 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + user instruction' },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1', 'base64image2'],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-1',
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: 'response-1',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,base64image2',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should handle multiple rounds correctly', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate.mockResolvedValue({
        id: 'response-3',
        output_text: 'test response 3',
        usage: { total_tokens: 70 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + user instruction' },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 764</point>")',
          },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1', 'base64image2', 'base64image3'],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-2',
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: 'response-2',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,base64image3',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should handle sliding window scenario (6th round)', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate.mockResolvedValue({
        id: 'response-6',
        output_text: 'test response 6',
        usage: { total_tokens: 80 },
      });

      // 6th round with sliding window (first image removed)
      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + user instruction' },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 764</point>")',
          },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 774</point>")',
          },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 784</point>")',
          },
          { from: 'human', value: '<image>' },
        ],
        images: [
          'base64image2',
          'base64image3',
          'base64image4',
          'base64image5',
          'base64image6',
        ],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-5',
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: 'response-5',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,base64image6',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });
  });

  describe('Input format conversion', () => {
    it('should convert image_url to input_image for Response API', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate.mockResolvedValue({
        id: 'response-1',
        output_text: 'test response',
        usage: { total_tokens: 50 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'Test message' },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: [
            { role: 'user', content: 'Test message' },
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,base64image1',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });
  });

  describe('Response API Incremental Logic', () => {
    it('should demonstrate incremental messages across multiple rounds', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      // Round 1: First call - should send all messages
      mockResponsesCreate.mockResolvedValueOnce({
        id: 'response-1',
        output_text: 'Action: click(point="<point>615 754</point>")',
        usage: { total_tokens: 50 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + open Chrome' },
          { from: 'human', value: '<image>' },
        ],
        images: ['screenshot1'],
        screenContext: { width: 1920, height: 1080 },
      });

      // Verify Round 1: All messages sent
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          model: 'test-model',
          input: [
            { role: 'user', content: 'System prompt + open Chrome' },
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,screenshot1',
                },
              ],
            },
          ],
          // No previous_response_id for first call
        }),
        expect.any(Object),
      );

      // Round 2: Second call - should send only new user message
      mockResponsesCreate.mockResolvedValueOnce({
        id: 'response-2',
        output_text: 'Action: type(content="hello world")',
        usage: { total_tokens: 60 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + open Chrome' },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
        ],
        images: ['screenshot1', 'screenshot2'],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-1',
      });

      // Verify Round 2: Only incremental message (after last assistant)
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: 'response-1',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,screenshot2',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );

      // Round 3: Third call - should send only new user message
      mockResponsesCreate.mockResolvedValueOnce({
        id: 'response-3',
        output_text: 'Action: click(point="<point>800 600</point>")',
        usage: { total_tokens: 70 },
      });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + open Chrome' },
          { from: 'human', value: '<image>' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
          { from: 'gpt', value: 'Action: type(content="hello world")' },
          { from: 'human', value: '<image>' },
        ],
        images: ['screenshot1', 'screenshot2', 'screenshot3'],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-2',
      });

      // Verify Round 3: Only incremental message
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: 'response-2',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,screenshot3',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );

      expect(mockResponsesCreate).toHaveBeenCalledTimes(3);
    });

    it('should handle sliding window scenario with clear incremental logic', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      // Simulate Round 6 where sliding window occurred
      // Original conversation had 6 images, but first one was removed
      // So conversation now starts from what was previously the 2nd image

      mockResponsesCreate.mockResolvedValue({
        id: 'response-6',
        output_text: 'Action: scroll(direction="down")',
        usage: { total_tokens: 80 },
      });

      await model.invoke({
        conversations: [
          // After sliding window: first image/conversation pair was removed
          { from: 'human', value: 'System prompt + open Chrome' },
          { from: 'human', value: '<image>' }, // This was originally screenshot2
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' }, // This was originally screenshot3
          { from: 'gpt', value: 'Action: type(content="hello")' },
          { from: 'human', value: '<image>' }, // This was originally screenshot4
          {
            from: 'gpt',
            value: 'Action: click(point="<point>800 600</point>")',
          },
          { from: 'human', value: '<image>' }, // This was originally screenshot5
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' }, // This is the new screenshot6
        ],
        images: [
          'screenshot2',
          'screenshot3',
          'screenshot4',
          'screenshot5',
          'screenshot6',
        ],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-5',
      });

      // Verify: Should send only the new user message (last one)
      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: 'response-5',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,screenshot6',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should show incremental pattern: text + image pairs', async () => {
      const model = new UITarsModel({
        apiKey: 'test-key',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate.mockResolvedValue({
        id: 'response-1',
        output_text: 'Action: click(point="<point>500 400</point>")',
        usage: { total_tokens: 50 },
      });

      // Test with text message followed by image message
      await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + navigate to website' },
          { from: 'human', value: 'Please check the current page' },
          { from: 'human', value: '<image>' },
        ],
        images: ['page_screenshot'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: [
            { role: 'user', content: 'System prompt + navigate to website' },
            { role: 'user', content: 'Please check the current page' },
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,page_screenshot',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });
  });
});
