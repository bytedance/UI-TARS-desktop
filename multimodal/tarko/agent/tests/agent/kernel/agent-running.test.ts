/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSnapshotNormalizer } from '../../../../agent-snapshot';
import { Agent, Tool, AgentStatus, ChatCompletionMessageToolCall, z } from '../../../src';
import { OpenAI } from '@tarko/model-provider';
import { createTestAgent, setupAgentTest } from './utils/testUtils';

const normalizer = new AgentSnapshotNormalizer({});
expect.addSnapshotSerializer(normalizer.createSnapshotSerializer());

describe('Agent Running Behavior', () => {
  const testContext = setupAgentTest();

  describe('run method basic behavior', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);

      // Mock the LLM client to avoid actual API calls
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              // Return a stream-like object that can be iterated
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    choices: [
                      {
                        delta: { content: 'This is a response' },
                        finish_reason: null,
                      },
                    ],
                  };
                  yield {
                    choices: [
                      {
                        delta: { content: ' from the mock LLM.' },
                        finish_reason: 'stop',
                      },
                    ],
                  };
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);

      // Mock model resolution to avoid errors
      vi.spyOn(agent, 'getCurrentResolvedModel').mockReturnValue({
        // @ts-expect-error
        provider: 'x',
        id: 'mock-model',
        actualProvider: 'openai',
      });
    });

    it('should handle concurrent execution attempts correctly', async () => {
      // Start one execution (mock it to never resolve)
      const runPromise = agent.run({ input: 'Hello', stream: false });

      // Status should now be EXECUTING
      expect(agent.status()).toBe(AgentStatus.EXECUTING);

      // Try to start another execution while the first is still running
      await expect(agent.run('Another request')).rejects.toThrow(
        'Agent is already executing a task',
      );

      // Abort the running execution
      agent.abort();

      // Clean up (ignore any errors from the aborted execution)
      try {
        await runPromise;
      } catch (e) {
        // Expected to throw due to abortion
      }
    });

    it('should properly abort execution', async () => {
      // Start execution with a mock that handles abort signal properly
      const slowLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(
              (params, options) =>
                new Promise((resolve, reject) => {
                  // Check if signal is already aborted
                  if (options?.signal?.aborted) {
                    reject(new Error('AbortError'));
                    return;
                  }

                  // Listen for abort events
                  const abortHandler = () => {
                    clearTimeout(timeout);
                    reject(new Error('AbortError'));
                  };

                  if (options?.signal) {
                    options.signal.addEventListener('abort', abortHandler);
                  }

                  // This promise will be aborted before resolving
                  const timeout = setTimeout(() => {
                    if (options?.signal) {
                      options.signal.removeEventListener('abort', abortHandler);
                    }
                    resolve({
                      choices: [{ message: { content: 'Too late' } }],
                    });
                  }, 60000);

                  // Store the timeout so we can clear it in test cleanup
                  testContext.mocks.timeout = timeout;
                }),
            ),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(slowLLMClient);

      // Start execution (don't await it yet)
      const runPromise = agent.run({ input: 'Hello', stream: false });

      // Status should now be EXECUTING
      expect(agent.status()).toBe(AgentStatus.EXECUTING);

      // Abort the execution
      const abortResult = agent.abort();
      expect(abortResult).toBe(true);

      // Status should now be ABORTED
      expect(agent.status()).toBe(AgentStatus.ABORTED);

      // Cleanup the never-resolving timeout
      if (testContext.mocks.timeout) {
        clearTimeout(testContext.mocks.timeout);
      }

      // The run promise should eventually resolve with abort message as AssistantMessageEvent
      const result = await runPromise;
      expect(result).toMatchInlineSnapshot(`
        {
          "id": "<<ID>>",
          "type": "assistant_message",
          "timestamp": "<<TIMESTAMP>>",
          "content": "Request was aborted",
          "finishReason": "abort"
        }
      `);
    });
  });

  describe('tool execution during run', () => {
    let agent: Agent;
    let mockTool: Tool;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);

      // Create a mock tool
      mockTool = {
        name: 'calculator',
        description: 'A simple calculator tool',
        schema: z.object({
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
          a: z.number(),
          b: z.number(),
        }),
        function: vi.fn().mockImplementation(({ operation, a, b }) => {
          switch (operation) {
            case 'add':
              return a + b;
            case 'subtract':
              return a - b;
            case 'multiply':
              return a * b;
            case 'divide':
              return a / b;
          }
        }),
        hasZodSchema: () => true,
        hasJsonSchema: () => false,
      };

      // Register the mock tool
      agent.registerTool(mockTool);

      // Mock the LLM client to return a response with tool calls
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              // Return a mock tool call stream
              return {
                [Symbol.asyncIterator]: async function* () {
                  // First yield a fake tool call
                  yield {
                    choices: [
                      {
                        delta: {
                          tool_calls: [
                            {
                              index: 0,
                              id: 'call_12345',
                              type: 'function',
                              function: {
                                name: 'calculator',
                                arguments: JSON.stringify({
                                  operation: 'add',
                                  a: 5,
                                  b: 3,
                                }),
                              },
                            },
                          ],
                        },
                        finish_reason: null,
                      },
                    ],
                  };

                  // Then yield the finish reason
                  yield {
                    choices: [
                      {
                        delta: {},
                        finish_reason: 'tool_calls',
                      },
                    ],
                  };
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);

      // Mock model resolution
      vi.spyOn(agent, 'getCurrentResolvedModel').mockReturnValue({
        // @ts-expect-error
        provider: 'x',
        id: 'mock-model',
        actualProvider: 'openai',
      });

      // Mock the onProcessToolCalls method to bypass actual tool execution
      vi.spyOn(agent, 'onProcessToolCalls').mockImplementation(async (id, toolCalls) => {
        // Return mock results for the tool calls
        return toolCalls.map((tc: ChatCompletionMessageToolCall) => {
          const args = JSON.parse(tc.function.arguments);
          return {
            toolCallId: tc.id,
            toolName: tc.function.name,
            content: `Calculated result: ${args.a + args.b}`,
          };
        });
      });
    });

    it('should handle tool calls through onProcessToolCalls hook', async () => {
      // Spy on the onProcessToolCalls method we mocked above
      const spy = vi.spyOn(agent, 'onProcessToolCalls');

      // Run the agent (but don't await the result since we've mocked just part of the process)
      try {
        const runPromise = agent.run({ input: 'Calculate 5 + 3', stream: false });

        // Give event loop time to process
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Abort the run to prevent hanging
        agent.abort();

        // Clean up
        try {
          await runPromise;
        } catch (e) {
          // Expected to throw due to abortion
        }

        // Verify the onProcessToolCalls method was called
        expect(spy).toHaveBeenCalled();

        // The first arg should be the session ID, and the second should be the tool calls
        const toolCalls = spy.mock.calls[0][1];
        expect(toolCalls).toHaveLength(1);
        expect(toolCalls[0].function.name).toBe('calculator');

        // Verify arguments were passed correctly
        const args = JSON.parse(toolCalls[0].function.arguments);
        expect(args).toEqual({
          operation: 'add',
          a: 5,
          b: 3,
        });
      } catch (e) {
        console.error('Test error:', e);
        throw e;
      }
    });
  });
});
