/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent, AgentStatus, AgentEventStream } from '../../src';
import { ChatCompletionChunk, OpenAI } from '@tarko/model-provider';
import { sleep } from './kernel/utils/testUtils';

describe('Agent Return Value Integrity Tests', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Non-Streaming Mode', () => {
    beforeEach(() => {
      // Mock LLM client for non-streaming mode
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  await sleep(10);
                  yield {
                    id: 'mock-completion',
                    choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: { content: 'Final answer' },
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

      agent.setCustomLLMClient(mockLLMClient);
    });

    it('should return a properly structured AssistantMessageEvent', async () => {
      const result = await agent.run('Hello');

      // Check result structure
      expect(result).toBeDefined();
      expect(result.type).toBe('assistant_message');
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.content).toBe('Final answer');
      expect(result.finishReason).toBe('stop');
    });

    it('should handle error cases gracefully', async () => {
      // Mock LLM client to throw an error
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API error')),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);

      const result = await agent.run('Hello');

      // Check that the error is properly propagated
      expect(result.content).toBe(
        'Sorry, an error occurred while processing your request: Error: API error',
      );

      expect(agent.status()).toBe(AgentStatus.IDLE);
    });

    it('should update agent status correctly during and after execution', async () => {
      // Before execution
      expect(agent.status()).toBe(AgentStatus.IDLE);

      // Start execution but don't await to check during execution
      const promise = agent.run('Hello');

      // Should be EXECUTING during run
      expect(agent.status()).toBe(AgentStatus.EXECUTING);

      // Wait for completion
      await promise;

      // Should be back to IDLE after completion
      expect(agent.status()).toBe(AgentStatus.IDLE);
    });
  });

  describe('Streaming Mode', () => {
    beforeEach(() => {
      // Mock LLM client for streaming mode
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              // Return a stream-like object that can be iterated
              return {
                [Symbol.asyncIterator]: async function* () {
                  await sleep(10);
                  yield {
                    id: 'chunk-1',
                    choices: [{ delta: { content: 'Stream' }, finish_reason: null }],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'chunk-2',
                    choices: [{ delta: { content: 'ing ' }, finish_reason: null }],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'chunk-3',
                    choices: [{ delta: { content: 'response' }, finish_reason: 'stop' }],
                  } as ChatCompletionChunk;
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);
    });

    it('should return an AsyncIterable in streaming mode', async () => {
      const stream = await agent.run({ input: 'Hello', stream: true });

      // Check it's an AsyncIterable
      expect(stream[Symbol.asyncIterator]).toBeDefined();
    });

    it('should yield correctly structured events in the stream', async () => {
      const stream = await agent.run({ input: 'Hello', stream: true });

      const events: AgentEventStream.Event[] = [];
      for await (const event of stream) {
        events.push(event);
      }

      // Stream should contain multiple events
      expect(events.length).toBeGreaterThan(0);

      // Each event should have required fields
      events.forEach((event) => {
        expect(event.id).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.type).toBeDefined();
      });

      // FIXME: consider whether it should be in stream
      // Should not include user_message event
      expect(events.some((e) => e.type === 'user_message')).toBe(true);

      // Should include at least one streaming event
      expect(
        events.some(
          (e) =>
            e.type === 'assistant_streaming_message' ||
            e.type === 'assistant_streaming_thinking_message',
        ),
      ).toBe(true);

      // Should include final assistant_message event
      expect(events.some((e) => e.type === 'assistant_message')).toBe(true);

      // Should include agent_run_start and agent_run_end events
      expect(events.some((e) => e.type === 'agent_run_start')).toBe(true);
      expect(events.some((e) => e.type === 'agent_run_end')).toBe(true);
    });

    it('should maintain proper event order in streaming mode', async () => {
      const stream = await agent.run({ input: 'Hello', stream: true });

      const events: AgentEventStream.Event[] = [];
      for await (const event of stream) {
        events.push(event);
      }

      // Find indices of key events
      const userMsgIndex = events.findIndex((e) => e.type === 'user_message');
      const runStartIndex = events.findIndex((e) => e.type === 'agent_run_start');
      const streamingIndex = events.findIndex((e) => e.type === 'assistant_streaming_message');
      const assistantMsgIndex = events.findIndex((e) => e.type === 'assistant_message');
      const runEndIndex = events.findIndex((e) => e.type === 'agent_run_end');

      // Streaming events should come after user message and agent_run_start
      if (streamingIndex !== -1) {
        expect(streamingIndex).toBeGreaterThan(userMsgIndex);
      }

      // assistant_message should come before agent_run_end
      if (assistantMsgIndex !== -1 && runEndIndex !== -1) {
        expect(assistantMsgIndex).toBeLessThan(runEndIndex);
      }
    });

    it('should handle aborted streaming gracefully', async () => {
      // Start stream but abort immediately
      const streamPromise = agent.run({
        input: 'Hello',
        stream: true,
      });

      setTimeout(() => {
        agent.abort();
      }, 10);

      // Get the stream
      const stream = await streamPromise;

      // Collect events from the aborted stream
      const events: AgentEventStream.Event[] = [];
      for await (const event of stream) {
        events.push(event);
      }

      // Should have assistant message with abort content instead of system event
      expect(
        events.some(
          (e) =>
            e.type === 'assistant_message' &&
            (e as AgentEventStream.AssistantMessageEvent).content === 'Request was aborted',
        ),
      ).toBe(true);

      // Agent status should be ABORTED
      expect(agent.status()).toBe(AgentStatus.ABORTED);
    });
  });

  describe('Mode switch handling', () => {
    // Test for ensuring correct behavior when switching between modes
    beforeEach(() => {
      // Mock LLM client for both modes
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async (params) => {
              // Always return streaming response regardless of params.stream
              return {
                [Symbol.asyncIterator]: async function* () {
                  // Streaming mode
                  await sleep(10);

                  yield {
                    id: 'chunk-1',
                    choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'chunk-1',
                    choices: [
                      { delta: { content: 'Final answer' }, index: 0, finish_reason: null },
                    ],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'chunk-1',
                    choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  } as ChatCompletionChunk;
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);
    });

    it('should handle mode switches correctly (non-stream -> stream)', async () => {
      // First run in non-streaming mode
      const result1 = await agent.run('First message');

      expect(result1.type).toBe('assistant_message');
      expect(result1.content).toBe('Final answer');

      // Then run in streaming mode
      const stream = await agent.run({ input: 'Second message', stream: true });
      const events: AgentEventStream.Event[] = [];
      for await (const event of stream) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'assistant_message')).toBe(true);
      expect(events.some((e) => e.type === 'agent_run_end')).toBe(true);
    });

    it('should handle mode switches correctly (stream -> non-stream)', async () => {
      // First run in streaming mode
      const stream = await agent.run({ input: 'First message', stream: true });
      const events: AgentEventStream.Event[] = [];
      for await (const event of stream) {
        events.push(event);
      }

      // Then run in non-streaming mode
      const result2 = await agent.run('Second message');
      expect(result2.type).toBe('assistant_message');
      expect(result2.content).toBe('Final answer');
    });
  });
});
