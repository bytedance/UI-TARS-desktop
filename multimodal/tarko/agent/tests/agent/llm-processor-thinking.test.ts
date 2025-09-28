/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, AgentEventStream } from '../../src';
import { OpenAI, ChatCompletionChunk } from '@tarko/model-provider';
import { sleep } from './kernel/utils/testUtils';

describe.skip('LLMProcessor Thinking Events', () => {
  let mockLLMClient: OpenAI;

  // Helper to create mock client with reasoning content
  const createReasoningMockClient = (streamingMode: boolean = true) => {
    return {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                // Start with reasoning content
                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [
                    {
                      delta: {
                        role: 'assistant',
                        reasoning_content: 'Let me think about this step by step.',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [
                    {
                      delta: {
                        reasoning_content: ' First, I need to understand the problem.',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [
                    {
                      delta: {
                        reasoning_content: ' Then I can provide a solution.',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                // Reasoning ends, content begins
                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [
                    {
                      delta: {
                        content: 'Based on my analysis, here is the answer.',
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Streaming Mode Thinking Events', () => {
    it('should emit streaming thinking events during reasoning phase', async () => {
      const agent = new Agent();
      agent.setCustomLLMClient(createReasoningMockClient(true));

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Test reasoning', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      // Should have streaming thinking events
      const streamingThinkingEvents = events.filter(
        (e) => e.type === 'assistant_streaming_thinking_message',
      ) as AgentEventStream.AssistantStreamingThinkingMessageEvent[];

      expect(streamingThinkingEvents.length).toBeGreaterThan(0);

      // Verify structure of streaming thinking events
      streamingThinkingEvents.forEach((event) => {
        expect(event.content).toBeDefined();
        expect(typeof event.isComplete).toBe('boolean');
        expect(event.messageId).toBeDefined();
      });

      // Should have final thinking event with duration
      const finalThinkingEvents = events.filter(
        (e) => e.type === 'assistant_thinking_message',
      ) as AgentEventStream.AssistantThinkingMessageEvent[];

      expect(finalThinkingEvents.length).toBe(1);
      const finalThinkingEvent = finalThinkingEvents[0];
      expect(finalThinkingEvent.content).toContain('Let me think about this step by step.');
      expect(finalThinkingEvent.isComplete).toBe(true);
      expect(finalThinkingEvent.thinkingDurationMs).toBeDefined();
      expect(typeof finalThinkingEvent.thinkingDurationMs).toBe('number');
      expect(finalThinkingEvent.thinkingDurationMs!).toBeGreaterThan(0);
    });

    it('should calculate accurate thinking duration in streaming mode', async () => {
      const agent = new Agent();
      agent.setCustomLLMClient(createReasoningMockClient(true));

      const events: AgentEventStream.Event[] = [];
      let firstThinkingTime: number | null = null;
      let finalThinkingTime: number | null = null;

      agent.getEventStream().subscribe((event) => {
        events.push(event);

        if (event.type === 'assistant_streaming_thinking_message' && !firstThinkingTime) {
          firstThinkingTime = event.timestamp;
        }

        if (event.type === 'assistant_thinking_message') {
          finalThinkingTime = event.timestamp;
        }
      });

      const stream = await agent.run({ input: 'Test reasoning', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      const finalThinkingEvents = events.filter(
        (e) => e.type === 'assistant_thinking_message',
      ) as AgentEventStream.AssistantThinkingMessageEvent[];

      expect(finalThinkingEvents.length).toBe(1);
      const finalEvent = finalThinkingEvents[0];

      // Duration should be reasonable (at least the sleep delays we added)
      expect(finalEvent.thinkingDurationMs).toBeGreaterThan(20); // At least 3 * 10ms delays

      // Duration should match approximately the time difference
      if (firstThinkingTime && finalThinkingTime) {
        const expectedDuration = finalThinkingTime - firstThinkingTime;
        // Allow some tolerance for timing variations
        expect(Math.abs(finalEvent.thinkingDurationMs! - expectedDuration)).toBeLessThan(100);
      }
    });

    it('should not emit duplicate thinking events in streaming mode', async () => {
      const agent = new Agent();
      agent.setCustomLLMClient(createReasoningMockClient(true));

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Test reasoning', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      // Should have streaming thinking events
      const streamingThinkingEvents = events.filter(
        (e) => e.type === 'assistant_streaming_thinking_message',
      );

      // Should have exactly one final thinking event (not duplicated)
      const finalThinkingEvents = events.filter((e) => e.type === 'assistant_thinking_message');

      expect(streamingThinkingEvents.length).toBeGreaterThan(0);
      expect(finalThinkingEvents.length).toBe(1); // No duplicates
    });
  });

  describe('Non-Streaming Mode Thinking Events', () => {
    it('should emit thinking event without duration in non-streaming mode', async () => {
      const agent = new Agent();
      agent.setCustomLLMClient(createReasoningMockClient(false));

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      // Run in non-streaming mode
      await agent.run('Test reasoning');

      // Should NOT have streaming thinking events
      const streamingThinkingEvents = events.filter(
        (e) => e.type === 'assistant_streaming_thinking_message',
      );
      expect(streamingThinkingEvents.length).toBe(0);

      // Should have final thinking event WITHOUT duration
      const finalThinkingEvents = events.filter(
        (e) => e.type === 'assistant_thinking_message',
      ) as AgentEventStream.AssistantThinkingMessageEvent[];

      expect(finalThinkingEvents.length).toBe(1);
      const finalThinkingEvent = finalThinkingEvents[0];
      expect(finalThinkingEvent.content).toContain('Let me think about this step by step.');
      expect(finalThinkingEvent.isComplete).toBe(true);
      expect(finalThinkingEvent.thinkingDurationMs).toBeUndefined(); // No duration in non-streaming
    });

    it('should still show complete reasoning content in non-streaming mode', async () => {
      const agent = new Agent();
      agent.setCustomLLMClient(createReasoningMockClient(false));

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      // Run in non-streaming mode
      await agent.run('Test reasoning');

      const finalThinkingEvents = events.filter(
        (e) => e.type === 'assistant_thinking_message',
      ) as AgentEventStream.AssistantThinkingMessageEvent[];

      expect(finalThinkingEvents.length).toBe(1);
      const finalEvent = finalThinkingEvents[0];

      // Should contain all reasoning content
      expect(finalEvent.content).toContain('Let me think about this step by step.');
      expect(finalEvent.content).toContain('First, I need to understand the problem.');
      expect(finalEvent.content).toContain('Then I can provide a solution.');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty reasoning content gracefully', async () => {
      const emptyReasoningMockClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  // No reasoning content, only regular content
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: {
                          role: 'assistant',
                          content: 'Direct answer without reasoning.',
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  yield {
                    id: 'mock-completion',
                    choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  } as ChatCompletionChunk;
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      const agent = new Agent();
      agent.setCustomLLMClient(emptyReasoningMockClient);

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Test no reasoning', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      // Should not have any thinking events when there's no reasoning
      const streamingThinkingEvents = events.filter(
        (e) => e.type === 'assistant_streaming_thinking_message',
      );
      const finalThinkingEvents = events.filter((e) => e.type === 'assistant_thinking_message');

      expect(streamingThinkingEvents.length).toBe(0);
      expect(finalThinkingEvents.length).toBe(0);

      // Should still have regular assistant message
      const assistantMessages = events.filter((e) => e.type === 'assistant_message');
      expect(assistantMessages.length).toBeGreaterThan(0);
    });

    it('should handle reasoning that ends abruptly', async () => {
      const abruptEndMockClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  // Start reasoning
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: {
                          role: 'assistant',
                          reasoning_content: 'Starting to think...',
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  // Reasoning stops abruptly, content starts immediately
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: {
                          content: 'Quick answer',
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  yield {
                    id: 'mock-completion',
                    choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  } as ChatCompletionChunk;
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      const agent = new Agent();
      agent.setCustomLLMClient(abruptEndMockClient);

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Test abrupt reasoning end', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      // Should have thinking events even if reasoning ended abruptly
      const streamingThinkingEvents = events.filter(
        (e) => e.type === 'assistant_streaming_thinking_message',
      );
      const finalThinkingEvents = events.filter((e) => e.type === 'assistant_thinking_message');

      expect(streamingThinkingEvents.length).toBeGreaterThan(0);
      expect(finalThinkingEvents.length).toBe(1);

      const finalEvent = finalThinkingEvents[0] as AgentEventStream.AssistantThinkingMessageEvent;
      expect(finalEvent.content).toContain('Starting to think...');
      expect(finalEvent.thinkingDurationMs).toBeDefined();
    });
  });
});
