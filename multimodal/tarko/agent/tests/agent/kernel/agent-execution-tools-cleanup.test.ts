/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Tool, z, PrepareRequestContext, PrepareRequestResult } from '../../../src';
import { OpenAI } from '@tarko/model-provider';
import { setupAgentTest } from './utils/testUtils';

describe('Agent Execution Tools Cleanup', () => {
  const testContext = setupAgentTest();

  describe('clearExecutionTools after loop completion', () => {
    let agent: Agent;
    let registeredTool: Tool;
    let dynamicTool: Tool;

    beforeEach(() => {
      // Create registered tool (persistent)
      registeredTool = new Tool({
        id: 'registeredTool',
        description: 'A tool registered at agent initialization',
        parameters: z.object({
          input: z.string(),
        }),
        function: async (args) => `Registered tool result: ${args.input}`,
      });

      // Create dynamic tool (only available during execution)
      dynamicTool = new Tool({
        id: 'dynamicTool',
        description: 'A tool created dynamically in onPrepareRequest',
        parameters: z.object({
          data: z.string(),
        }),
        function: async (args) => `Dynamic tool result: ${args.data}`,
      });

      // Create agent with custom onPrepareRequest
      class TestAgent extends Agent {
        public onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
          const { systemPrompt } = context;

          // Return both registered and dynamic tools during execution
          return {
            systemPrompt,
            tools: [registeredTool, dynamicTool],
          };
        }
      }

      agent = new TestAgent();

      // Register only the persistent tool
      agent.registerTool(registeredTool);

      // Mock LLM client to avoid actual API calls
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    choices: [
                      {
                        delta: { content: 'Task completed successfully.' },
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

      // Mock model resolution
      vi.spyOn(agent, 'getCurrentResolvedModel').mockReturnValue({
        // @ts-expect-error
        provider: 'x',
        id: 'mock-model',
        actualProvider: 'openai',
      });
    });

    it('should set execution tools during onPrepareRequest and clear them after loop completion', async () => {
      const toolProcessor = agent.runner.toolProcessor;

      // Before execution - should only have registered tools
      const toolsBeforeExecution = toolProcessor.getTools();
      expect(toolsBeforeExecution).toHaveLength(1);
      expect(toolsBeforeExecution[0].name).toBe('registeredTool');

      // Spy on setExecutionTools and clearExecutionTools
      const setExecutionToolsSpy = vi.spyOn(toolProcessor, 'setExecutionTools');
      const clearExecutionToolsSpy = vi.spyOn(toolProcessor, 'clearExecutionTools');

      // Execute the agent
      const result = await agent.run('Test execution with dynamic tools');

      // Verify execution completed successfully
      expect(result.content).toBe('Task completed successfully.');

      // Verify setExecutionTools was called with both registered and dynamic tools
      expect(setExecutionToolsSpy).toHaveBeenCalled();
      const executionToolsCall = setExecutionToolsSpy.mock.calls[0][0];
      expect(executionToolsCall).toHaveLength(2);
      expect(executionToolsCall.map((t) => t.name)).toEqual(['registeredTool', 'dynamicTool']);

      // Verify clearExecutionTools was called after execution
      expect(clearExecutionToolsSpy).toHaveBeenCalled();

      // After execution - should be back to only registered tools
      const toolsAfterExecution = toolProcessor.getTools();
      expect(toolsAfterExecution).toHaveLength(1);
      expect(toolsAfterExecution[0].name).toBe('registeredTool');
    });

    it('should handle multiple consecutive executions with proper cleanup', async () => {
      const toolProcessor = agent.runner.toolProcessor;

      // Spies for tracking calls
      const setExecutionToolsSpy = vi.spyOn(toolProcessor, 'setExecutionTools');
      const clearExecutionToolsSpy = vi.spyOn(toolProcessor, 'clearExecutionTools');

      // First execution
      await agent.run('First execution');

      // Verify first execution set and cleared tools
      expect(setExecutionToolsSpy).toHaveBeenCalledTimes(1);
      expect(clearExecutionToolsSpy).toHaveBeenCalledTimes(1);

      // Check tools are properly cleared after first execution
      const toolsAfterFirst = toolProcessor.getTools();
      expect(toolsAfterFirst).toHaveLength(1);
      expect(toolsAfterFirst[0].name).toBe('registeredTool');

      // Second execution
      await agent.run('Second execution');

      // Verify second execution also set and cleared tools
      expect(setExecutionToolsSpy).toHaveBeenCalledTimes(2);
      expect(clearExecutionToolsSpy).toHaveBeenCalledTimes(2);

      // Check tools are properly cleared after second execution
      const toolsAfterSecond = toolProcessor.getTools();
      expect(toolsAfterSecond).toHaveLength(1);
      expect(toolsAfterSecond[0].name).toBe('registeredTool');

      // Verify both executions used the same set of tools (registered + dynamic)
      setExecutionToolsSpy.mock.calls.forEach((call) => {
        const tools = call[0];
        expect(tools).toHaveLength(2);
        expect(tools.map((t) => t.name)).toEqual(['registeredTool', 'dynamicTool']);
      });
    });

    it('should clear execution tools even when execution throws an error', async () => {
      const toolProcessor = agent.runner.toolProcessor;

      // Mock LLM client to throw an error
      const errorLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('Mock LLM error')),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(errorLLMClient);

      const clearExecutionToolsSpy = vi.spyOn(toolProcessor, 'clearExecutionTools');

      // Execute the agent (should throw error)
      try {
        await agent.run('Test error handling');
      } catch (error) {
        // Expected to throw
        expect(error).toBeDefined();
      }

      // Verify clearExecutionTools was still called despite the error
      expect(clearExecutionToolsSpy).toHaveBeenCalled();

      // Verify tools are properly cleared after error
      const toolsAfterError = toolProcessor.getTools();
      expect(toolsAfterError).toHaveLength(1);
      expect(toolsAfterError[0].name).toBe('registeredTool');
    });

    it('should demonstrate onPrepareRequest modifying tools based on context', async () => {
      // Create agent that modifies tools based on iteration
      class IterationAwareAgent extends Agent {
        public onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
          const { systemPrompt, iteration } = context;

          // Add different tools based on iteration number
          const tools = [registeredTool];

          if (iteration === 1) {
            // First iteration: add dynamic tool
            tools.push(dynamicTool);
          } else if (iteration && iteration > 1) {
            // Later iterations: add a different tool
            const laterTool = new Tool({
              id: 'laterIterationTool',
              description: 'Tool available in later iterations',
              parameters: z.object({}),
              function: async () => 'Later iteration result',
            });
            tools.push(laterTool);
          }

          return {
            systemPrompt: `${systemPrompt}\nIteration: ${iteration || 1}`,
            tools,
          };
        }
      }

      const iterationAgent = new IterationAwareAgent();
      iterationAgent.registerTool(registeredTool);

      // Mock model and LLM client
      vi.spyOn(iterationAgent, 'getCurrentResolvedModel').mockReturnValue({
        // @ts-expect-error
        provider: 'x',
        id: 'mock-model',
        actualProvider: 'openai',
      });

      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    choices: [
                      {
                        delta: { content: 'Iteration-aware response' },
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

      iterationAgent.setCustomLLMClient(mockLLMClient);

      const toolProcessor = iterationAgent.runner.toolProcessor;
      const setExecutionToolsSpy = vi.spyOn(toolProcessor, 'setExecutionTools');

      // Execute the iteration-aware agent
      await iterationAgent.run('Test iteration-aware tools');

      // Verify tools were set during execution
      expect(setExecutionToolsSpy).toHaveBeenCalled();

      // Should have registered tool + dynamic tool for iteration 1
      const executionTools = setExecutionToolsSpy.mock.calls[0][0];
      expect(executionTools).toHaveLength(2);
      expect(executionTools.map((t) => t.name)).toEqual(['registeredTool', 'dynamicTool']);

      // After execution, should be back to registered tools only
      const finalTools = toolProcessor.getTools();
      expect(finalTools).toHaveLength(1);
      expect(finalTools[0].name).toBe('registeredTool');
    });
  });

  describe('onPrepareRequest hook integration', () => {
    it('should demonstrate tool filtering based on user input', async () => {
      const locationTool = new Tool({
        id: 'getCurrentLocation',
        description: "Get user's current location",
        parameters: z.object({}),
        function: async () => {
          return { location: 'Boston' };
        },
      });

      const weatherTool = new Tool({
        id: 'getWeather',
        description: 'Get weather information',
        parameters: z.object({
          location: z.string(),
        }),
        function: async (args) => {
          return { weather: `Sunny in ${args.location}` };
        },
      });

      class AdaptiveAgent extends Agent {
        public onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
          const { systemPrompt } = context;

          // Create a modified location tool that returns different location
          const dynamicLocationTool = new Tool({
            id: 'getCurrentLocation',
            description: "Get user's current location",
            parameters: z.object({}),
            function: async () => {
              return { location: 'Hangzhou' };
            },
          });

          return {
            systemPrompt,
            tools: [dynamicLocationTool], // Only return the modified tool
          };
        }
      }

      const agent = new AdaptiveAgent();

      // Register original tools
      agent.registerTool(locationTool);
      agent.registerTool(weatherTool);

      // Mock LLM and model
      vi.spyOn(agent, 'getCurrentResolvedModel').mockReturnValue({
        // @ts-expect-error
        provider: 'x',
        id: 'mock-model',
        actualProvider: 'openai',
      });

      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    choices: [
                      {
                        delta: {
                          content:
                            'Your current location is Hangzhou (modified by onPrepareRequest).',
                        },
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

      const toolProcessor = agent.runner.toolProcessor;
      const setExecutionToolsSpy = vi.spyOn(toolProcessor, 'setExecutionTools');

      // Execute with user input about location
      const result = await agent.run('What is my current location?');

      // Verify the response reflects the modified tool
      expect(result.content).toBe(
        'Your current location is Hangzhou (modified by onPrepareRequest).',
      );

      // Verify only the modified tool was set during execution
      expect(setExecutionToolsSpy).toHaveBeenCalled();
      const executionTools = setExecutionToolsSpy.mock.calls[0][0];
      expect(executionTools).toHaveLength(1);
      expect(executionTools[0].name).toBe('getCurrentLocation');

      // After execution, should be back to registered tools (2 tools)
      const finalTools = toolProcessor.getTools();
      expect(finalTools).toHaveLength(2);
      expect(finalTools.map((t) => t.name)).toEqual(['getCurrentLocation', 'getWeather']);
    });
  });
});
