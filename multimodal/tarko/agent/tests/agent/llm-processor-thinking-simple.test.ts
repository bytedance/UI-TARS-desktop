/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, AgentEventStream } from '../../src';
import { OpenAI, ChatCompletionChunk } from '@tarko/model-provider';

describe('LLMProcessor Thinking Events - Simple', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle responses without reasoning content', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                yield {
                  id: 'test',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        content: 'Hello world',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                yield {
                  id: 'test',
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent();
    agent.setCustomLLMClient(mockClient);

    const events: AgentEventStream.Event[] = [];
    agent.getEventStream().subscribe((event) => {
      events.push(event);
    });

    await agent.run('Test');

    // Should not have thinking events when no reasoning
    const thinkingEvents = events.filter(
      (e) =>
        e.type === 'assistant_thinking_message' ||
        e.type === 'assistant_streaming_thinking_message',
    );
    expect(thinkingEvents.length).toBe(0);

    // Should have regular assistant message
    const assistantMessages = events.filter((e) => e.type === 'assistant_message');
    expect(assistantMessages.length).toBeGreaterThan(0);
  });

  it('should handle reasoning content in streaming mode', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                // First yield reasoning
                yield {
                  id: 'test',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        reasoning_content: 'Let me think...',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Then regular content
                yield {
                  id: 'test',
                  choices: [
                    {
                      delta: {
                        content: 'Here is my answer',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                yield {
                  id: 'test',
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent();
    agent.setCustomLLMClient(mockClient);

    const events: AgentEventStream.Event[] = [];
    agent.getEventStream().subscribe((event) => {
      events.push(event);
    });

    const stream = await agent.run({ input: 'Test reasoning', stream: true });

    // Consume stream
    for await (const event of stream) {
      // Process events
    }

    // Should have thinking events when reasoning present
    const streamingThinkingEvents = events.filter(
      (e) => e.type === 'assistant_streaming_thinking_message',
    );
    const finalThinkingEvents = events.filter((e) => e.type === 'assistant_thinking_message');

    // At minimum, should have some thinking events
    expect(streamingThinkingEvents.length + finalThinkingEvents.length).toBeGreaterThan(0);

    // Should have regular assistant message
    const assistantMessages = events.filter((e) => e.type === 'assistant_message');
    expect(assistantMessages.length).toBeGreaterThan(0);
  });
});
