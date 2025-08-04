/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Tool, z, AgentEventStream } from '../../src';
import { OpenAI, ChatCompletionChunk } from '@tarko/model-provider';
import { sleep } from './kernel/utils/testUtils';

describe('Streaming Tool Call Events Configuration', () => {
  let mockLLMClient: OpenAI;

  // Helper to create a mock that simulates complete agent loop
  const createCompleteMockClient = () => {
    let callCount = 0;

    return {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            callCount++;

            if (callCount === 1) {
              // First call: Return a tool call
              return {
                [Symbol.asyncIterator]: async function* () {
                  await sleep(10);
                  yield {
                    id: 'mock-completion-1',
                    choices: [
                      {
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              id: 'call-123',
                              type: 'function',
                              function: {
                                name: 'testTool',
                                arguments: '{"param":', // First chunk of arguments
                              },
                            },
                          ],
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'mock-completion-1',
                    choices: [
                      {
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              function: {
                                arguments: '"value"}', // Second chunk of arguments
                              },
                            },
                          ],
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'mock-completion-1',
                    choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }],
                  } as ChatCompletionChunk;
                },
              };
            } else {
              // Second call: Return final answer
              return {
                [Symbol.asyncIterator]: async function* () {
                  await sleep(10);
                  yield {
                    id: 'mock-completion-2',
                    choices: [
                      {
                        delta: {
                          content: 'Based on the tool result, here is the final answer.',
                          role: 'assistant',
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  await sleep(10);
                  yield {
                    id: 'mock-completion-2',
                    choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
                  } as ChatCompletionChunk;
                },
              };
            }
          }),
        },
      },
    } as unknown as OpenAI;
  };

  beforeEach(() => {
    // Mock LLM client with realistic streaming tool call response
    mockLLMClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
                // Simulate realistic streaming: arguments come in incremental chunks
                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            index: 0,
                            id: 'call-123',
                            type: 'function',
                            function: {
                              name: 'testTool',
                              arguments: '{"param":', // First chunk of arguments
                            },
                          },
                        ],
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
                        tool_calls: [
                          {
                            index: 0,
                            function: {
                              arguments: '"value"}', // Second chunk of arguments
                            },
                          },
                        ],
                      },
                      index: 0,
                      finish_reason: null,
                    },
                  ],
                } as ChatCompletionChunk;

                await sleep(10);
                yield {
                  id: 'mock-completion',
                  choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }],
                } as ChatCompletionChunk;
              },
            };
          }),
        },
      },
    } as unknown as OpenAI;
  });

  describe('when enableStreamingToolCallEvents is false (default)', () => {
    it('should not emit assistant_streaming_tool_call events', async () => {
      const agent = new Agent({
        // enableStreamingToolCallEvents is false by default
        tools: [
          new Tool({
            id: 'testTool',
            description: 'A test tool',
            parameters: z.object({ param: z.string() }),
            function: async () => 'Tool result',
          }),
        ],
      });

      agent.setCustomLLMClient(createCompleteMockClient());

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Use the test tool', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      // Should not have any assistant_streaming_tool_call events
      const streamingToolCallEvents = events.filter(
        (e) => e.type === 'assistant_streaming_tool_call',
      );
      expect(streamingToolCallEvents).toHaveLength(0);

      // Should still have regular tool_call and tool_result events
      const toolCallEvents = events.filter((e) => e.type === 'tool_call');
      const toolResultEvents = events.filter((e) => e.type === 'tool_result');
      expect(toolCallEvents.length).toBeGreaterThan(0);
      expect(toolResultEvents.length).toBeGreaterThan(0);
    });
  });

  describe('when enableStreamingToolCallEvents is true', () => {
    it('should emit assistant_streaming_tool_call events with correct messageId grouping', async () => {
      const agent = new Agent({
        enableStreamingToolCallEvents: true,
        tools: [
          new Tool({
            id: 'testTool',
            description: 'A test tool',
            parameters: z.object({ param: z.string() }),
            function: async () => 'Tool result',
          }),
        ],
      });

      agent.setCustomLLMClient(createCompleteMockClient());

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Use the test tool', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      console.log('events', events);
      // Should have assistant_streaming_tool_call events
      const streamingToolCallEvents = events.filter(
        (e) => e.type === 'assistant_streaming_tool_call',
      ) as AgentEventStream.AssistantStreamingToolCallEvent[];

      expect(streamingToolCallEvents.length).toBeGreaterThan(0);

      // Verify the streaming events have correct structure
      streamingToolCallEvents.forEach((event) => {
        expect(event.toolCallId).toBeDefined();
        expect(event.toolName).toBeDefined();
        expect(event.arguments).toBeDefined();
        expect(typeof event.isComplete).toBe('boolean');
        expect(event.messageId).toBeDefined();
      });

      // Get the first messageId for tool call events (should be the first occurrence)
      const firstToolCallMessageId = streamingToolCallEvents[0]?.messageId;
      expect(firstToolCallMessageId).toBeDefined();

      // Accumulate arguments from streaming events for the SAME messageId only
      let accumulatedArgs = '';
      streamingToolCallEvents.forEach((event) => {
        if (
          event.toolCallId === 'call-123' &&
          event.messageId === firstToolCallMessageId &&
          !event.isComplete
        ) {
          accumulatedArgs += event.arguments;
        }
      });

      console.log('accumulatedArgs', accumulatedArgs);

      // Should be able to parse accumulated arguments as valid JSON
      expect(() => JSON.parse(accumulatedArgs)).not.toThrow();
      const parsedArgs = JSON.parse(accumulatedArgs);
      expect(parsedArgs).toEqual({ param: 'value' });

      // Verify we have both argument chunks and completion event for the same messageId
      const argumentEvents = streamingToolCallEvents.filter(
        (e) =>
          e.toolCallId === 'call-123' && e.messageId === firstToolCallMessageId && !e.isComplete,
      );
      console.log('streamingToolCallEvents', streamingToolCallEvents);

      const completionEvents = streamingToolCallEvents.filter(
        (e) =>
          e.toolCallId === 'call-123' && e.messageId === firstToolCallMessageId && e.isComplete,
      );

      expect(argumentEvents.length).toBeGreaterThan(0);
      expect(completionEvents.length).toBe(1);

      // Verify that agent loop completed properly (should have final assistant message)
      const assistantMessages = events.filter((e) => e.type === 'assistant_message');
      expect(assistantMessages.length).toBe(2); // One for tool call, one for final answer

      const finalMessage = assistantMessages[
        assistantMessages.length - 1
      ] as AgentEventStream.AssistantMessageEvent;
      expect(finalMessage.finishReason).toBe('stop');
      expect(finalMessage.content).toContain('final answer');
    });

    it('should handle empty argument chunks gracefully', async () => {
      // Create a mock that includes empty argument chunks (realistic scenario)
      const emptyChunkMockClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  // Tool call with name only (no arguments yet)
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              id: 'call-empty-args',
                              type: 'function',
                              function: {
                                name: 'testTool',
                                // No arguments in this chunk
                              },
                            },
                          ],
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  // Arguments start
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              function: {
                                arguments: '{}',
                              },
                            },
                          ],
                        },
                        index: 0,
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  yield {
                    id: 'mock-completion',
                    choices: [{ delta: {}, index: 0, finish_reason: 'tool_calls' }],
                  } as ChatCompletionChunk;
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      const agent = new Agent({
        enableStreamingToolCallEvents: true,
        tools: [
          new Tool({
            id: 'testTool',
            description: 'A test tool',
            parameters: z.object({}),
            function: async () => 'Tool result',
          }),
        ],
      });

      agent.setCustomLLMClient(emptyChunkMockClient);

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Use the test tool', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

      const streamingToolCallEvents = events.filter(
        (e) => e.type === 'assistant_streaming_tool_call',
      ) as AgentEventStream.AssistantStreamingToolCallEvent[];

      expect(streamingToolCallEvents.length).toBeGreaterThan(0);

      // Should have both events with and without arguments
      const eventsWithArgs = streamingToolCallEvents.filter(
        (e) => e.arguments && e.arguments.length > 0,
      );
      const eventsWithoutArgs = streamingToolCallEvents.filter(
        (e) => !e.arguments || e.arguments.length === 0,
      );

      expect(eventsWithArgs.length).toBeGreaterThan(0);
      expect(eventsWithoutArgs.length).toBeGreaterThan(0);
    });
  });

  describe('performance impact verification', () => {
    it('should have measurable performance difference when streaming events are disabled', async () => {
      const createAgent = (enableStreaming: boolean) =>
        new Agent({
          enableStreamingToolCallEvents: enableStreaming,
          tools: [
            new Tool({
              id: 'testTool',
              description: 'A test tool',
              parameters: z.object({ param: z.string() }),
              function: async () => 'Tool result',
            }),
          ],
        });

      // Test with streaming disabled
      const agentDisabled = createAgent(false);
      agentDisabled.setCustomLLMClient(createCompleteMockClient());

      const eventsDisabled: AgentEventStream.Event[] = [];
      agentDisabled.getEventStream().subscribe((event) => {
        eventsDisabled.push(event);
      });

      const streamDisabled = await agentDisabled.run({ input: 'Use the test tool', stream: true });
      for await (const event of streamDisabled) {
        // Consume stream
      }

      // Test with streaming enabled
      const agentEnabled = createAgent(true);
      agentEnabled.setCustomLLMClient(createCompleteMockClient());

      const eventsEnabled: AgentEventStream.Event[] = [];
      agentEnabled.getEventStream().subscribe((event) => {
        eventsEnabled.push(event);
      });

      const streamEnabled = await agentEnabled.run({ input: 'Use the test tool', stream: true });
      for await (const event of streamEnabled) {
        // Consume stream
      }

      // Verify different number of events
      const streamingEventsDisabled = eventsDisabled.filter(
        (e) => e.type === 'assistant_streaming_tool_call',
      );
      const streamingEventsEnabled = eventsEnabled.filter(
        (e) => e.type === 'assistant_streaming_tool_call',
      );

      expect(streamingEventsDisabled).toHaveLength(0);
      expect(streamingEventsEnabled.length).toBeGreaterThan(0);
    });
  });
});
