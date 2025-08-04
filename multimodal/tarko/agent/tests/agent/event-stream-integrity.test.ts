/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { Agent, Tool } from '../../src';
import { OpenAI } from '@tarko/model-provider';
import { setupAgentTest } from './kernel/utils/testUtils';

describe('Event Stream Integrity Tests', () => {
  const testContext = setupAgentTest();
  let agent: Agent;
  let eventStreamSpy: MockInstance;

  beforeEach(() => {
    agent = new Agent();

    // Spy on the event stream's sendEvent method
    eventStreamSpy = vi.spyOn(agent.getEventStream(), 'sendEvent');

    // Mock LLM client to avoid actual API calls
    const mockLLMClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            // Return a stream-like object that can be iterated
            return {
              [Symbol.asyncIterator]: async function* () {
                yield {
                  id: 'mock-completion',
                  choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
                } as ChatCompletionChunk;
                yield {
                  id: 'mock-completion',
                  choices: [{ delta: { content: 'Test response' }, index: 0, finish_reason: null }],
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

    agent.setCustomLLMClient(mockLLMClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Creation and Dispatch', () => {
    it('should create and send user_message event at the start of execution', async () => {
      await agent.run('Hello');

      // Check that user_message event was sent
      const userMessageEvents = eventStreamSpy.mock.calls.filter(
        (call) => call[0].type === 'user_message',
      );

      expect(userMessageEvents.length).toBeGreaterThan(0);
      expect(userMessageEvents[0][0]).toMatchObject({
        type: 'user_message',
        content: 'Hello',
      });
    });

    it('should create and send agent_run_start event', async () => {
      await agent.run('Hello');

      // Check that agent_run_start event was sent
      const runStartEvents = eventStreamSpy.mock.calls.filter(
        (call) => call[0].type === 'agent_run_start',
      );

      expect(runStartEvents.length).toBeGreaterThan(0);
      expect(runStartEvents[0][0]).toMatchObject({
        type: 'agent_run_start',
      });
      // Ensure it contains session ID and model info
      expect(runStartEvents[0][0].sessionId).toBeDefined();
      expect(runStartEvents[0][0].provider).toBeDefined();
      expect(runStartEvents[0][0].model).toBeDefined();
    });

    it('should create and send assistant_message event', async () => {
      await agent.run('Hello');

      // Check that assistant_message event was sent
      const assistantEvents = eventStreamSpy.mock.calls.filter(
        (call) => call[0].type === 'assistant_message',
      );

      expect(assistantEvents.length).toBeGreaterThan(0);
      expect(assistantEvents[0][0]).toMatchObject({
        type: 'assistant_message',
        content: 'Test response',
      });
    });

    it('should create and send agent_run_end event at the end of execution', async () => {
      await agent.run('Hello');

      // Check that agent_run_end event was sent
      const runEndEvents = eventStreamSpy.mock.calls.filter(
        (call) => call[0].type === 'agent_run_end',
      );

      expect(runEndEvents.length).toBeGreaterThan(0);
      expect(runEndEvents[0][0]).toMatchObject({
        type: 'agent_run_end',
      });
      // Ensure it contains session ID and elapsed time
      expect(runEndEvents[0][0].sessionId).toBeDefined();
      expect(runEndEvents[0][0].elapsedMs).toBeDefined();
      expect(runEndEvents[0][0].iterations).toBeDefined();
    });
  });

  describe('Event Order and Sequence', () => {
    it('should emit events in the correct sequence', async () => {
      await agent.run('Hello');

      // Get all event types in order
      const eventSequence = eventStreamSpy.mock.calls.map((call) => call[0].type);

      // Check the basic required sequence
      expect(eventSequence).toContain('user_message');
      expect(eventSequence).toContain('agent_run_start');
      expect(eventSequence).toContain('assistant_message');
      expect(eventSequence).toContain('agent_run_end');

      // Check sequence is in the correct order
      const userIndex = eventSequence.indexOf('user_message');
      const startIndex = eventSequence.indexOf('agent_run_start');
      const assistantIndex = eventSequence.indexOf('assistant_message');
      const endIndex = eventSequence.indexOf('agent_run_end');

      // Agent run start can happen before or after user message, but the important part is
      // that assistant message happens after these and before run end
      expect(assistantIndex).toBeGreaterThan(userIndex);
      expect(endIndex).toBeGreaterThan(assistantIndex);
    });
  });

  describe('Event Content Validation', () => {
    it('should include required fields in events', async () => {
      await agent.run('Hello');

      // Check all events have required base fields
      eventStreamSpy.mock.calls.forEach((call) => {
        const event = call[0];
        expect(event.id).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.type).toBeDefined();
      });
    });

    it('should handle tool calls and results in event stream', async () => {
      // Register a test tool
      const testTool = new Tool({
        id: 'testTool',
        description: 'A test tool',
        parameters: { type: 'object', properties: {} },
        function: async () => 'Tool result',
      });

      agent.registerTool(testTool);

      // Mock LLM client to return a tool call using streaming response
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              // Return a stream-like object that can be iterated
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    id: 'mock-completion',
                    choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
                  } as ChatCompletionChunk;
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

      agent.setCustomLLMClient(mockLLMClient);

      await agent.run('Use the test tool');

      // Check for tool_call event
      const toolCallEvents = eventStreamSpy.mock.calls.filter(
        (call) => call[0].type === 'tool_call',
      );

      expect(toolCallEvents.length).toBeGreaterThan(0);
      expect(toolCallEvents[0][0]).toMatchObject({
        type: 'tool_call',
        name: 'testTool',
      });

      // Check for tool_result event
      const toolResultEvents = eventStreamSpy.mock.calls.filter(
        (call) => call[0].type === 'tool_result',
      );

      expect(toolResultEvents.length).toBeGreaterThan(0);
      expect(toolResultEvents[0][0]).toMatchObject({
        type: 'tool_result',
        name: 'testTool',
      });
    });
  });
});
