/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSnapshotNormalizer } from '../../../../agent-snapshot';
import {
  Agent,
  AgentEventStream,
  Tool,
  AgentStatus,
  ChatCompletionMessageToolCall,
  z,
} from '../../../src';
import { OpenAI } from '@multimodal/model-provider';
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

      // The run promise should eventually resolve with abort message
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

    it('should clear execution tools after each loop completion', async () => {
      // Create a test tool
      const testTool = new Tool({
        id: 'testTool',
        description: 'A test tool for execution context cleanup',
        parameters: z.object({
          message: z.string(),
        }),
        function: async (args) => `Tool executed with: ${args.message}`,
      });

      // Register the tool
      agent.registerTool(testTool);

      // Create spies for the tool processor methods
      const setExecutionToolsSpy = vi.spyOn(agent.runner.toolProcessor, 'setExecutionTools');
      const clearExecutionToolsSpy = vi.spyOn(agent.runner.toolProcessor, 'clearExecutionTools');
      const getToolsSpy = vi.spyOn(agent.runner.toolProcessor, 'getTools');

      // First run - should set and clear execution tools
      await agent.run({ input: 'First run', stream: false });

      // Verify setExecutionTools was called during the first run
      expect(setExecutionToolsSpy).toHaveBeenCalled();

      // Verify clearExecutionTools was called after the first run
      expect(clearExecutionToolsSpy).toHaveBeenCalled();

      // Reset spies for the second run
      setExecutionToolsSpy.mockClear();
      clearExecutionToolsSpy.mockClear();
      getToolsSpy.mockClear();

      // Second run - should set and clear execution tools again
      await agent.run({ input: 'Second run', stream: false });

      // Verify setExecutionTools was called during the second run
      expect(setExecutionToolsSpy).toHaveBeenCalled();

      // Verify clearExecutionTools was called after the second run
      expect(clearExecutionToolsSpy).toHaveBeenCalled();

      // Verify that after both runs, the tool processor falls back to registered tools
      // This ensures that clearExecutionTools() actually cleared the execution context
      const currentTools = agent.runner.toolProcessor.getTools();
      expect(currentTools).toHaveLength(1);
      expect(currentTools[0].name).toBe('testTool');
    });

    it('should clear execution tools even when run is aborted', async () => {
      // Create a test tool
      const testTool = new Tool({
        id: 'abortTestTool',
        description: 'A test tool for abort scenario',
        parameters: z.object({}),
        function: async () => 'Tool result',
      });

      agent.registerTool(testTool);

      // Create a mock that simulates a slow execution that will be aborted
      // This mock properly handles the abort signal
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

                  // This will be aborted before resolving
                  const timeout = setTimeout(() => {
                    if (options?.signal) {
                      options.signal.removeEventListener('abort', abortHandler);
                    }
                    resolve({
                      [Symbol.asyncIterator]: async function* () {
                        yield {
                          choices: [
                            {
                              delta: { content: 'Response after delay' },
                              finish_reason: 'stop',
                            },
                          ],
                        };
                      },
                    });
                  }, 5000); // 5 second delay

                  testContext.mocks.timeout = timeout;
                }),
            ),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(slowLLMClient);

      // Create spy for clearExecutionTools
      const clearExecutionToolsSpy = vi.spyOn(agent.runner.toolProcessor, 'clearExecutionTools');

      // Start execution
      const runPromise = agent.run({ input: 'Test abort cleanup', stream: false });

      // Wait a bit to ensure execution starts
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Abort the execution
      agent.abort();

      // Clean up timeout
      if (testContext.mocks.timeout) {
        clearTimeout(testContext.mocks.timeout);
      }

      // Wait for the run to complete (with abort)
      const result = await runPromise;

      // Verify the result is an abort message
      expect(result.content).toBe('Request was aborted');
      expect(result.finishReason).toBe('abort');

      // Verify that clearExecutionTools was called even after abort
      expect(clearExecutionToolsSpy).toHaveBeenCalled();

      // Verify tools are properly cleaned up
      const currentTools = agent.runner.toolProcessor.getTools();
      expect(currentTools).toHaveLength(1);
      expect(currentTools[0].name).toBe('abortTestTool');
    });

    it('should clear execution tools after streaming run completion', async () => {
      // Create a test tool
      const streamTestTool = new Tool({
        id: 'streamTestTool',
        description: 'A test tool for streaming scenario',
        parameters: z.object({
          input: z.string(),
        }),
        function: async (args) => `Streaming result: ${args.input}`,
      });

      agent.registerTool(streamTestTool);

      // Create spy for clearExecutionTools
      const clearExecutionToolsSpy = vi.spyOn(agent.runner.toolProcessor, 'clearExecutionTools');

      // Run in streaming mode
      const stream = await agent.run({ input: 'Test streaming cleanup', stream: true });

      // Consume the entire stream
      const events = [];
      for await (const event of stream) {
        events.push(event);
      }

      // Verify that clearExecutionTools was called after streaming completion
      expect(clearExecutionToolsSpy).toHaveBeenCalled();

      // Verify tools are properly available after cleanup
      const currentTools = agent.runner.toolProcessor.getTools();
      expect(currentTools).toHaveLength(1);
      expect(currentTools[0].name).toBe('streamTestTool');
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
