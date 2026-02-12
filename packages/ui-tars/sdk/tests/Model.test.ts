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
    mockCreate.mockReset();
    mockResponsesCreate.mockReset();
    mockResponsesDelete.mockReset();
  });

  describe('ChatCompletion API', () => {
    it('should send all messages for ChatCompletion API', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: '',
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
    it('should shape Codex responses requests with stream and stateless options', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: 'codex-token',
        baseURL: 'https://test.com',
        model: 'gpt-5.3-codex',
        useResponsesApi: true,
        codexResponses: {
          enabled: true,
          store: false,
          include: ['reasoning.encrypted_content'],
          reasoningEffort: 'high',
        },
      });

      const encoder = new TextEncoder();
      const codexSseBody = [
        'data: {"type":"response.output_text.delta","delta":"Action: click(start_box=\\"[0.1,0.1,0.1,0.1]\\")"}\n\n',
        'data: {"type":"response.completed","response":{"id":"response-codex-1","output_text":"Action: click(start_box=\\"[0.1,0.1,0.1,0.1]\\")","usage":{"total_tokens":77}}}\n\n',
        'data: [DONE]\n\n',
      ].join('');
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(codexSseBody));
            controller.close();
          },
        }),
      } as Response);

      const result = await model.invoke({
        conversations: [{ from: 'human', value: 'Open the first result' }],
        images: [],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(result.prediction).toContain('Action: click');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, requestInit] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe('https://test.com/responses');
      const requestHeaders =
        (requestInit?.headers as Record<string, string> | undefined) ?? {};
      const authorizationHeader = Object.entries(requestHeaders).find(
        ([key]) => key.toLowerCase() === 'authorization',
      )?.[1];
      expect(authorizationHeader).toBe('Bearer codex-token');

      const body = JSON.parse((requestInit?.body as string) ?? '{}');
      expect(body).toEqual(
        expect.objectContaining({
          model: 'gpt-5.3-codex',
          stream: true,
          store: false,
          include: ['reasoning.encrypted_content'],
          instructions: 'Open the first result',
          reasoning: {
            effort: 'high',
          },
        }),
      );
      expect(body.input?.[0]).toEqual(
        expect.objectContaining({
          type: 'message',
          role: 'user',
        }),
      );

      fetchMock.mockRestore();
    });

    it('should keep explicit authorization header for Codex stream requests', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: 'fallback-token',
        baseURL: 'https://test.com',
        model: 'gpt-5.3-codex',
        useResponsesApi: true,
        codexResponses: {
          enabled: true,
          store: false,
          include: ['reasoning.encrypted_content'],
          reasoningEffort: 'high',
        },
      });

      const encoder = new TextEncoder();
      const codexSseBody = [
        'data: {"type":"response.output_text.delta","delta":"Action: wait()"}\n\n',
        'data: {"type":"response.completed","response":{"id":"response-codex-auth","output_text":"Action: wait()","usage":{"total_tokens":12}}}\n\n',
        'data: [DONE]\n\n',
      ].join('');
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(codexSseBody));
            controller.close();
          },
        }),
      } as Response);

      await model.invoke({
        conversations: [{ from: 'human', value: 'Wait for content to load' }],
        images: [],
        screenContext: { width: 1920, height: 1080 },
        headers: {
          Authorization: 'Bearer explicit-token',
        },
      });

      const requestInit = fetchMock.mock.calls[0]?.[1];
      const requestHeaders =
        (requestInit?.headers as Record<string, string> | undefined) ?? {};
      const authorizationHeader = Object.entries(requestHeaders).find(
        ([key]) => key.toLowerCase() === 'authorization',
      )?.[1];
      expect(authorizationHeader).toBe('Bearer explicit-token');

      fetchMock.mockRestore();
    });

    it('should not send previous_response_id in Codex requests', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: '',
        baseURL: 'https://test.com',
        model: 'gpt-5.3-codex',
        useResponsesApi: true,
        codexResponses: {
          enabled: true,
          store: false,
          include: ['reasoning.encrypted_content'],
          reasoningEffort: 'high',
        },
      });

      const encoder = new TextEncoder();
      const createSseResponse = (responseId: string, text: string) => {
        const body = [
          `data: {"type":"response.output_text.delta","delta":"${text}"}\n\n`,
          `data: {"type":"response.completed","response":{"id":"${responseId}","output_text":"${text}","usage":{"total_tokens":10}}}\n\n`,
          'data: [DONE]\n\n',
        ].join('');

        return {
          ok: true,
          status: 200,
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(body));
              controller.close();
            },
          }),
        } as Response;
      };

      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          createSseResponse('resp-codex-1', 'Thought: analyze. Action: wait()'),
        );

      await model.invoke({
        conversations: [
          { from: 'human', value: 'Open calculator' },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1'],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: 'response-from-previous-round',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const firstBody = JSON.parse(
        (fetchMock.mock.calls[0]?.[1]?.body as string) ?? '{}',
      );

      expect(firstBody.previous_response_id).toBeUndefined();
      expect(firstBody.instructions).toBe('Open calculator');
      expect(firstBody.input).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'message',
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'input_text',
              }),
            ]),
          }),
          expect.objectContaining({
            type: 'message',
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'input_image',
              }),
            ]),
          }),
        ]),
      );

      fetchMock.mockRestore();
    });

    it('should track Codex image responses for cleanup when store is enabled', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: 'codex-token',
        baseURL: 'https://test.com',
        model: 'gpt-5.3-codex',
        useResponsesApi: true,
        codexResponses: {
          enabled: true,
          store: true,
          include: ['reasoning.encrypted_content'],
          reasoningEffort: 'high',
        },
      });

      const encoder = new TextEncoder();
      const createSseResponse = (responseId: string, text: string) => {
        const body = [
          `data: {"type":"response.output_text.delta","delta":"${text}"}\n\n`,
          `data: {"type":"response.completed","response":{"id":"${responseId}","output_text":"${text}","usage":{"total_tokens":10}}}\n\n`,
          'data: [DONE]\n\n',
        ].join('');

        return {
          ok: true,
          status: 200,
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(body));
              controller.close();
            },
          }),
        } as Response;
      };

      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          createSseResponse('resp-codex-1', 'Action: wait()'),
        )
        .mockResolvedValueOnce(
          createSseResponse('resp-codex-2', 'Action: wait()'),
        );

      await model.invoke({
        conversations: [
          { from: 'human', value: 'Open settings' },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockResponsesDelete).not.toHaveBeenCalled();

      await model.invoke({
        conversations: [{ from: 'human', value: '<image>' }],
        images: ['base64image2'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockResponsesDelete).toHaveBeenCalledTimes(1);
      expect(mockResponsesDelete).toHaveBeenCalledWith(
        'resp-codex-1',
        expect.any(Object),
      );

      fetchMock.mockRestore();
    });

    it('should send all messages for Response API (first call)', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: '',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate
        .mockResolvedValueOnce({
          id: 'response-1',
          output_text: 'test response',
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          output_text: 'test response 2',
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

      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          model: 'test-model',
          input: [
            { role: 'user', content: 'System prompt + user instruction' },
          ],
        }),
        expect.any(Object),
      );

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
        ['api' + 'Key']: '',
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
        ['api' + 'Key']: '',
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
        ['api' + 'Key']: '',
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
        ['api' + 'Key']: '',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate
        .mockResolvedValueOnce({
          id: 'response-1',
          output_text: 'test response',
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          output_text: 'test response 2',
          usage: { total_tokens: 60 },
        });

      await model.invoke({
        conversations: [
          { from: 'human', value: 'Test message' },
          { from: 'human', value: '<image>' },
        ],
        images: ['base64image1'],
        screenContext: { width: 1920, height: 1080 },
      });

      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          input: [{ role: 'user', content: 'Test message' }],
        }),
        expect.any(Object),
      );
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          input: [
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
          previous_response_id: 'response-1',
        }),
        expect.any(Object),
      );
    });
  });

  describe('Response API Incremental Logic', () => {
    it('should demonstrate incremental messages across multiple rounds', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: '',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      // Round 1: First call - should send all messages
      mockResponsesCreate
        .mockResolvedValueOnce({
          id: 'response-1',
          output_text: 'Action: click(point="<point>615 754</point>")',
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          output_text: 'Action: type(content="hello world")',
          usage: { total_tokens: 60 },
        })
        .mockResolvedValueOnce({
          id: 'response-3',
          output_text: 'Action: click(point="<point>800 600</point>")',
          usage: { total_tokens: 70 },
        })
        .mockResolvedValueOnce({
          id: 'response-4',
          output_text: 'Action: wait()',
          usage: { total_tokens: 80 },
        });

      const { responseId } = await model.invoke({
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
          input: [{ role: 'user', content: 'System prompt + open Chrome' }],
        }),
        expect.any(Object),
      );
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          previous_response_id: 'response-1',
          input: [
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
        }),
        expect.any(Object),
      );

      // Round 2: Second call - should send only new user message
      const { responseId: responseId2 } = await model.invoke({
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
        previousResponseId: responseId,
      });

      // Verify Round 2: Only incremental message (after last assistant)
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId,
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

      const { responseId: responseId3 } = await model.invoke({
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
        previousResponseId: responseId2,
      });

      // Verify Round 3: Only incremental message
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId2,
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

      expect(mockResponsesCreate).toHaveBeenCalledTimes(4);
    });

    it('should handle sliding window scenario with clear incremental logic', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: '',
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
        ['api' + 'Key']: '',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      mockResponsesCreate
        .mockResolvedValueOnce({
          id: 'response-1',
          output_text: 'Action: click(point="<point>500 400</point>")',
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          output_text: 'Action: type(content="hello world")',
          usage: { total_tokens: 60 },
        })
        .mockResolvedValueOnce({
          id: 'response-3',
          output_text: 'Action: click(point="<point>800 600</point>")',
          usage: { total_tokens: 70 },
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

      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          input: [
            { role: 'user', content: 'System prompt + navigate to website' },
          ],
        }),
        expect.any(Object),
      );

      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          previous_response_id: 'response-1',
          input: [{ role: 'user', content: 'Please check the current page' }],
        }),
        expect.any(Object),
      );

      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          previous_response_id: 'response-2',
          input: [
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

    it('should demonstrate incremental messages exceeds MAX_IMAGES', async () => {
      const model = new UITarsModel({
        ['api' + 'Key']: '',
        baseURL: 'https://test.com',
        model: 'test-model',
        useResponsesApi: true,
      });

      // Round 1: First call - should send all messages
      mockResponsesCreate
        .mockResolvedValueOnce({
          id: 'response-1',
          output_text: 'Action: click(point="<point>615 754</point>")',
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          output_text: 'Action: type(content="hello world")',
          usage: { total_tokens: 60 },
        })
        .mockResolvedValueOnce({
          id: 'response-3',
          output_text: 'Action: click(point="<point>800 600</point>")',
          usage: { total_tokens: 70 },
        })
        .mockResolvedValueOnce({
          id: 'response-4',
          output_text: 'Action: wait()',
          usage: { total_tokens: 80 },
        })
        .mockResolvedValueOnce({
          id: 'response-5',
          output_text: 'Action: wait()',
          usage: { total_tokens: 80 },
        })
        .mockResolvedValueOnce({
          id: 'response-6',
          output_text: 'Action: wait()',
          usage: { total_tokens: 80 },
        })
        .mockResolvedValueOnce({
          id: 'response-7',
          output_text: 'Action: wait()',
          usage: { total_tokens: 80 },
        });

      const { responseId: responseId2 } = await model.invoke({
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
          input: [{ role: 'user', content: 'System prompt + open Chrome' }],
        }),
        expect.any(Object),
      );
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          previous_response_id: 'response-1',
          input: [
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
        }),
        expect.any(Object),
      );

      // Round 2: Second call - should send only new user message
      const { responseId: responseId3 } = await model.invoke({
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
        previousResponseId: responseId2,
      });

      // Verify Round 2: Only incremental message (after last assistant)
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId2,
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

      const { responseId: responseId4 } = await model.invoke({
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
        previousResponseId: responseId3,
      });

      // Verify Round 3: Only incremental message
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId3,
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

      // Round 4: Third call - should send only new user message
      const { responseId: responseId5 } = await model.invoke({
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
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' },
        ],
        images: ['screenshot1', 'screenshot2', 'screenshot3', 'screenshot4'],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: responseId4,
      });

      console.log('responseId4', responseId4);
      // Verify Round 3: Only incremental message
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId4,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,screenshot4',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );

      // Round 4: Third call - should send only new user message
      const { responseId: responseId6 } = await model.invoke({
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
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' },
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' },
        ],
        images: [
          'screenshot1',
          'screenshot2',
          'screenshot3',
          'screenshot4',
          'screenshot5',
        ],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: responseId5,
      });

      // Verify Round 4: Only incremental message
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        6,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId5,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: 'data:image/png;base64,screenshot5',
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );

      // Round 5: Third call - should send only new user message
      const { responseId: responseId7 } = await model.invoke({
        conversations: [
          { from: 'human', value: 'System prompt + open Chrome' },
          {
            from: 'gpt',
            value: 'Action: click(point="<point>615 754</point>")',
          },
          { from: 'human', value: '<image>' },
          { from: 'gpt', value: 'Action: type(content="hello world")' },
          { from: 'human', value: '<image>' },
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' },
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' },
          { from: 'gpt', value: 'Action: wait()' },
          { from: 'human', value: '<image>' },
        ],
        images: [
          'screenshot2',
          'screenshot3',
          'screenshot4',
          'screenshot5',
          'screenshot6',
        ],
        screenContext: { width: 1920, height: 1080 },
        previousResponseId: responseId6,
      });

      expect(mockResponsesDelete).toHaveBeenNthCalledWith(
        1,
        'response-2',
        expect.any(Object),
      );

      // Verify Round 3: Only incremental message
      expect(mockResponsesCreate).toHaveBeenNthCalledWith(
        7,
        expect.objectContaining({
          model: 'test-model',
          previous_response_id: responseId6,
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
      expect(mockResponsesCreate).toHaveBeenCalledTimes(7);
    });
  });
});
