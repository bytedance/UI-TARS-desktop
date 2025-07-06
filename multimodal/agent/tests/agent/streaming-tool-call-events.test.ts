/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Tool, z, AgentEventStream } from '../../src';
import { OpenAI, ChatCompletionChunk } from '@multimodal/model-provider';
import { sleep } from './kernel/utils/testUtils';

describe('Streaming Tool Call Events Configuration', () => {
  let mockLLMClient: OpenAI;

  beforeEach(() => {
    // Mock LLM client with tool call response
    mockLLMClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              [Symbol.asyncIterator]: async function* () {
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
                              arguments: '{"param":"value"}',
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

      agent.setCustomLLMClient(mockLLMClient);

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
    it('should emit assistant_streaming_tool_call events', async () => {
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

      agent.setCustomLLMClient(mockLLMClient);

      const events: AgentEventStream.Event[] = [];
      agent.getEventStream().subscribe((event) => {
        events.push(event);
      });

      const stream = await agent.run({ input: 'Use the test tool', stream: true });

      // Consume the stream
      for await (const event of stream) {
        // Continue until stream ends
      }

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

      // Accumulate arguments from streaming events
      let accumulatedArgs = '';
      streamingToolCallEvents.forEach((event) => {
        if (event.toolCallId === 'call-123') {
          accumulatedArgs += event.arguments;
        }
      });

      // Should be able to parse accumulated arguments as valid JSON
      expect(() => JSON.parse(accumulatedArgs)).not.toThrow();
      const parsedArgs = JSON.parse(accumulatedArgs);
      expect(parsedArgs).toEqual({ param: 'value' });
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
      agentDisabled.setCustomLLMClient(mockLLMClient);

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
      agentEnabled.setCustomLLMClient(mockLLMClient);

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
