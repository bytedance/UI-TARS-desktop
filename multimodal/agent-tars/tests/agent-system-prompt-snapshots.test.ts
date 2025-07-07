import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { AgentTARS } from '../src/agent-tars';
import {
  OpenAI,
  ChatCompletionChunk,
  PrepareRequestContext,
  PrepareRequestResult,
} from '@mcp-agent/core';
import { AgentSnapshotNormalizer } from '../../agent-snapshot/src';

// Setup snapshot normalizer
const normalizer = new AgentSnapshotNormalizer({});
expect.addSnapshotSerializer(normalizer.createSnapshotSerializer());

describe('Agent TARS System Prompt Snapshots', () => {
  let agent: AgentTARS;
  let systemPrompts: string[] = [];

  beforeEach(() => {
    systemPrompts = [];
  });

  afterEach(async () => {
    if (agent) {
      await agent.cleanup();
    }
    vi.clearAllMocks();
  });

  describe('System Prompt Evolution Across Loops', () => {
    it.only('should capture system prompts for the first two loops with planner', async () => {
      class SystemPromptCapturingAgent extends AgentTARS {
        override onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
          systemPrompts.push(context.systemPrompt);
          console.log(`[DEBUG] System prompt captured for loop ${systemPrompts.length}`);
          return super.onPrepareRequest(context);
        }
      }

      agent = new SystemPromptCapturingAgent({
        id: 'test-agent',
        name: 'Test Agent TARS',
        instructions: 'You are a test assistant.',
        model: {
          provider: 'volcengine',
          id: 'doubao-pro',
        },
        toolCallEngine: 'native',
        planner: {
          enable: true,
          strategy: 'default',
          maxSteps: 3,
        },
        browser: {
          type: 'local',
          headless: true,
          control: 'hybrid',
        },
        search: {
          provider: 'browser_search',
          count: 5,
        },
        workspace: {
          workingDirectory: resolve(__dirname, '.test-workspace'),
        },
        maxIterations: 5,
      });

      // Mock LLM client to simulate proper tool calls for multiple loops
      let callCount = 0;
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              callCount++;
              console.log(`[DEBUG] LLM call ${callCount}`);

              return {
                [Symbol.asyncIterator]: async function* () {
                  if (callCount === 1) {
                    // First loop: Generate a plan
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content: 'I need to create a plan to help you with this task.',
                          },

                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for generate_plan
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: 'call_generate_plan_1',
                                type: 'function',
                                function: {
                                  name: 'generate_plan',
                                  arguments: JSON.stringify({
                                    steps: [
                                      {
                                        content: 'Search for weather information',
                                        done: false,
                                      },
                                      {
                                        content: 'Analyze the search results',
                                        done: false,
                                      },
                                    ],
                                    needsPlanning: true,
                                  }),
                                },
                              },
                            ],
                          },

                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-1',
                      choices: [{ delta: {}, finish_reason: 'tool_calls' }],
                    } as ChatCompletionChunk;
                  } else if (callCount === 2) {
                    // Second loop: Execute the plan with search
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'Now I will execute the plan by searching for weather information.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for web_search
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: 'call_search_1',
                                type: 'function',
                                function: {
                                  name: 'web_search',
                                  arguments: JSON.stringify({
                                    query: 'weather today',
                                  }),
                                },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-2',
                      choices: [{ delta: {}, finish_reason: 'tool_calls' }],
                    } as ChatCompletionChunk;
                  } else if (callCount === 3) {
                    // Third loop: Update plan with completion
                    yield {
                      id: 'mock-completion-3',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',

                            content: 'Let me update the plan with the completed steps.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for update_plan
                    yield {
                      id: 'mock-completion-3',
                      choices: [
                        {
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: 'call_update_plan_1',
                                type: 'function',
                                function: {
                                  name: 'update_plan',
                                  arguments: JSON.stringify({
                                    steps: [
                                      {
                                        content: 'Search for weather information',
                                        done: true,
                                      },
                                      {
                                        content: 'Analyze the search results',
                                        done: true,
                                      },
                                    ],
                                    completed: true,
                                  }),
                                },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-3',
                      choices: [{ delta: {}, finish_reason: 'tool_calls' }],
                    } as ChatCompletionChunk;
                  } else {
                    // Final loop: Provide final answer
                    yield {
                      id: 'mock-completion-4',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'Based on my search and analysis, here is the weather information you requested. The plan has been completed successfully.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-4',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
                    } as ChatCompletionChunk;
                  }
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);
      await agent.initialize();

      console.log('[DEBUG] Starting agent.run()');
      const response = await agent.run('Help me find information about the weather today.');
      console.log('[DEBUG] Agent run completed');
      console.log('response', response);
      console.log(`[DEBUG] Total system prompts captured: ${systemPrompts.length}`);

      // Verify we captured system prompts for at least 3 loops
      expect(systemPrompts.length).toBeGreaterThanOrEqual(3);

      // Snapshot the system prompts
      expect(systemPrompts[0]).toMatchSnapshot('first-loop-system-prompt-with-planner');
      expect(systemPrompts[1]).toMatchSnapshot('second-loop-system-prompt-with-planner');
      if (systemPrompts[2]) {
        expect(systemPrompts[2]).toMatchSnapshot('third-loop-system-prompt-with-planner');
      }
    });

    it('should capture system prompts without planner (simpler case)', async () => {
      class SystemPromptCapturingAgent extends AgentTARS {
        override onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
          systemPrompts.push(context.systemPrompt);
          return super.onPrepareRequest(context);
        }
      }

      agent = new SystemPromptCapturingAgent({
        id: 'test-agent-no-planner',
        name: 'Test Agent TARS',
        model: {
          provider: 'volcengine',
          id: 'doubao-pro',
        },
        browser: {
          type: 'local',
          headless: true,
          control: 'hybrid',
        },
        search: {
          provider: 'browser_search',
          count: 5,
        },
        workspace: {
          workingDirectory: resolve(__dirname, '.test-workspace'),
        },
        mcpImpl: 'in-memory',
        maxIterations: 3,
      });

      // Mock LLM for simpler case without planner
      let callCount = 0;
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              callCount++;

              return {
                [Symbol.asyncIterator]: async function* () {
                  if (callCount === 1) {
                    // First loop: Search
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content: 'I will search for weather information.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for web_search
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: 'call_search_1',
                                type: 'function',
                                function: {
                                  name: 'web_search',
                                  arguments: JSON.stringify({
                                    query: 'weather today',
                                  }),
                                },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-1',
                      choices: [{ delta: {}, finish_reason: 'tool_calls' }],
                    } as ChatCompletionChunk;
                  } else {
                    // Second loop: Final answer
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content: 'Based on my search, here is the weather information.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-2',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
                    } as ChatCompletionChunk;
                  }
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);
      await agent.initialize();
      await agent.run('What is the weather today?');

      // Verify we captured system prompts for both loops
      expect(systemPrompts).toHaveLength(2);

      // Snapshot the system prompts
      expect(systemPrompts[0]).toMatchSnapshot('first-loop-system-prompt-no-planner');
      expect(systemPrompts[1]).toMatchSnapshot('second-loop-system-prompt-no-planner');
    });
  });
});
