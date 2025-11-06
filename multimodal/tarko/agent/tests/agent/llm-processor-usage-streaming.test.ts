/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../../src';
import { OpenAI, ChatCompletionChunk } from '@tarko/model-provider';

describe('LLMProcessor Usage in Streaming Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract usage from the last chunk in streaming mode', async () => {
    const mockUsage = {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                // First chunk without usage
                yield {
                  id: 'test-completion',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        content: 'Hello',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Second chunk without usage
                yield {
                  id: 'test-completion',
                  choices: [
                    {
                      delta: {
                        content: ' world',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Last chunk with usage information
                yield {
                  id: 'test-completion',
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  usage: mockUsage,
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent();
    agent.setCustomLLMClient(mockClient);

    // Spy on onLLMResponse to verify usage is included
    const onLLMResponseSpy = vi.spyOn(agent, 'onLLMResponse');

    const stream = await agent.run({ input: 'Test', stream: true });

    // Consume stream
    for await (const event of stream) {
      // Process events
    }

    // Verify onLLMResponse was called
    expect(onLLMResponseSpy).toHaveBeenCalled();

    // Get the response object passed to onLLMResponse
    const callArgs = onLLMResponseSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();

    const response = callArgs[1].response;
    expect(response).toBeDefined();

    // Verify usage was extracted and included in the response
    expect(response.usage).toBeDefined();
    expect(response.usage).toEqual(mockUsage);
    expect(response.usage?.prompt_tokens).toBe(10);
    expect(response.usage?.completion_tokens).toBe(20);
    expect(response.usage?.total_tokens).toBe(30);
  });

  it('should handle streaming responses without usage information', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                yield {
                  id: 'test-completion',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        content: 'Response without usage',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Last chunk without usage information
                yield {
                  id: 'test-completion',
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  // No usage field
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent();
    agent.setCustomLLMClient(mockClient);

    const onLLMResponseSpy = vi.spyOn(agent, 'onLLMResponse');

    const stream = await agent.run({ input: 'Test', stream: true });

    // Consume stream
    for await (const event of stream) {
      // Process events
    }

    // Verify onLLMResponse was called
    expect(onLLMResponseSpy).toHaveBeenCalled();

    const callArgs = onLLMResponseSpy.mock.calls[0];
    const response = callArgs[1].response;

    // Usage should be undefined when not provided
    expect(response.usage).toBeUndefined();
  });

  it('should extract usage even when present in middle chunks (edge case)', async () => {
    const mockUsage = {
      prompt_tokens: 15,
      completion_tokens: 25,
      total_tokens: 40,
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                yield {
                  id: 'test-completion',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        content: 'First',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Middle chunk with usage (some providers might send it here)
                yield {
                  id: 'test-completion',
                  choices: [
                    {
                      delta: {
                        content: ' middle',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                  usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
                } as ChatCompletionChunk;

                // Last chunk with final usage (should override)
                yield {
                  id: 'test-completion',
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  usage: mockUsage,
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent();
    agent.setCustomLLMClient(mockClient);

    const onLLMResponseSpy = vi.spyOn(agent, 'onLLMResponse');

    const stream = await agent.run({ input: 'Test', stream: true });

    // Consume stream
    for await (const event of stream) {
      // Process events
    }

    const callArgs = onLLMResponseSpy.mock.calls[0];
    const response = callArgs[1].response;

    // Should use usage from the last chunk
    expect(response.usage).toEqual(mockUsage);
    expect(response.usage?.total_tokens).toBe(40);
  });

  it('should work correctly with tool calls and usage', async () => {
    const mockUsage = {
      prompt_tokens: 50,
      completion_tokens: 10,
      total_tokens: 60,
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                // Tool call chunks
                yield {
                  id: 'test-completion',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        tool_calls: [
                          {
                            index: 0,
                            id: 'call-123',
                            type: 'function',
                            function: {
                              name: 'test_tool',
                              arguments: '{"arg": "value"}',
                            },
                          },
                        ],
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Last chunk with usage
                yield {
                  id: 'test-completion',
                  choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }],
                  usage: mockUsage,
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent({
      tools: [
        {
          name: 'test_tool',
          description: 'Test tool',
          schema: {},
          function: async () => 'tool result',
          hasZodSchema: () => false,
          hasJsonSchema: () => true,
        },
      ],
    });
    agent.setCustomLLMClient(mockClient);

    const onLLMResponseSpy = vi.spyOn(agent, 'onLLMResponse');

    const stream = await agent.run({ input: 'Test with tools', stream: true });

    // Consume stream
    for await (const event of stream) {
      // Process events
    }

    // onLLMResponse should be called at least once for the tool call
    expect(onLLMResponseSpy).toHaveBeenCalled();

    // Check the first call (tool call response)
    const firstCallArgs = onLLMResponseSpy.mock.calls[0];
    const firstResponse = firstCallArgs[1].response;

    // Usage should be present even with tool calls
    expect(firstResponse.usage).toEqual(mockUsage);
  });
});
