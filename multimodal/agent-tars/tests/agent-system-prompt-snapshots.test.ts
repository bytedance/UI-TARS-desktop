import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { OpenAI, ChatCompletionChunk } from '@mcp-agent/core';
import { AgentSnapshotNormalizer } from '../../agent-snapshot/src';
import { MockableAgentTARS, COMMON_MOCKS } from './utils/mock-agent';
import { normalizeSystemPromptForSnapshot } from './utils/normalizer';

// Setup snapshot normalizer
const normalizer = new AgentSnapshotNormalizer({});
expect.addSnapshotSerializer(normalizer.createSnapshotSerializer());

describe('Agent TARS System Prompt Snapshots', () => {
  let agent: MockableAgentTARS;

  beforeEach(() => {
    // Clear any previous state
  });

  afterEach(async () => {
    if (agent) {
      await agent.cleanup();
    }
    vi.clearAllMocks();
  });

  describe('System Prompt Evolution Across Loops', () => {
    it('should capture system prompts for the first two loops with planner', async () => {
      agent = new MockableAgentTARS({
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

      // Setup mocks for web_search tool using common mocks
      agent.setMockResult('web_search', COMMON_MOCKS.web_search.weather);

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
                    // First loop: Create todos
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content: 'I need to create a todo list to help you with this task.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for create_todos
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: 'call_create_todos_1',
                                type: 'function',
                                function: {
                                  name: 'create_todos',
                                  arguments: JSON.stringify({
                                    title: 'Weather Information Search',
                                    todos:
                                      '- [ ] Search for weather information\n- [ ] Analyze the search results',
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

                    // Tool call for web_search (this will be mocked)
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
                    // Third loop: Update todos with completion
                    yield {
                      id: 'mock-completion-3',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content: 'Let me update the todos with the completed steps.',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for edit_todos
                    yield {
                      id: 'mock-completion-3',
                      choices: [
                        {
                          delta: {
                            tool_calls: [
                              {
                                index: 0,
                                id: 'call_edit_todos_1',
                                type: 'function',
                                function: {
                                  name: 'edit_todos',
                                  arguments: JSON.stringify({
                                    thought:
                                      '1. WHAT: I am completing the weather search task by updating the todo list after successfully searching for weather information. 2. DUPLICATE CHECK: I am not repeating work - I just completed the web search and now updating progress. 3. WHY: I believe both tasks are complete because I executed the web_search tool and received weather results. My confidence level is 95 (out of 100). 4. REFLECTION: My judgment is thorough - I completed the search and have the information needed. 5. NEXT: I should provide the final answer to the user.',
                                    todos:
                                      '- [x] Search for weather information\n- [x] Analyze the search results',
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
                              'Based on my search and analysis, here is the weather information you requested. The todo list has been completed successfully.',
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
      expect(response.content).toMatchInlineSnapshot(
        `"Based on my search and analysis, here is the weather information you requested. The todo list has been completed successfully."`,
      );

      const systemPrompts = agent.getSystemPrompts();
      const toolHistory = agent.getToolCallHistory();

      console.log(`[DEBUG] Total system prompts captured: ${systemPrompts.length}`);
      console.log(`[DEBUG] Tool calls made: ${toolHistory.length}`);

      // Verify web_search was mocked
      const searchCalls = toolHistory.filter((call) => call.toolName === 'web_search');
      expect(searchCalls).toHaveLength(1);
      expect(searchCalls[0].result).toEqual(COMMON_MOCKS.web_search.weather);

      // Verify we captured system prompts for at least 3 loops
      expect(systemPrompts.length).toBeGreaterThanOrEqual(3);

      // Snapshot the system prompts with cross-platform normalization
      expect(normalizeSystemPromptForSnapshot(systemPrompts[0])).toMatchSnapshot(
        'first-loop-system-prompt-with-planner',
      );
      expect(normalizeSystemPromptForSnapshot(systemPrompts[1])).toMatchSnapshot(
        'second-loop-system-prompt-with-planner',
      );
      if (systemPrompts[2]) {
        expect(normalizeSystemPromptForSnapshot(systemPrompts[2])).toMatchSnapshot(
          'third-loop-system-prompt-with-planner',
        );
      }
    });

    it('should capture system prompts without planner (simpler case)', async () => {
      agent = new MockableAgentTARS({
        id: 'test-agent-no-planner',
        name: 'Test Agent TARS',
        toolCallEngine: 'native',
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
        maxIterations: 5,
      });

      // Setup dynamic mock for web_search based on query
      agent.setDynamicMock('web_search', COMMON_MOCKS.web_search.general);

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

                    // Tool call for web_search (will be mocked dynamically)
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
      const response = await agent.run('What is the weather today?');
      expect(response.content).toMatchInlineSnapshot(
        `"Based on my search, here is the weather information."`,
      );

      const systemPrompts = agent.getSystemPrompts();
      const toolHistory = agent.getToolCallHistory();
      console.log('toolHistory', toolHistory);

      // Verify dynamic mock worked
      const searchCalls = toolHistory.filter((call) => call.toolName === 'web_search');
      expect(searchCalls).toHaveLength(1);
      expect(searchCalls[0].args.query).toBe('weather today');
      expect(searchCalls[0].result.pages[0].title).toContain('weather today');

      // Verify we captured system prompts for both loops
      expect(systemPrompts).toHaveLength(2);

      // Snapshot the system prompts with cross-platform normalization
      expect(normalizeSystemPromptForSnapshot(systemPrompts[0])).toMatchSnapshot(
        'first-loop-system-prompt-no-planner',
      );
      expect(normalizeSystemPromptForSnapshot(systemPrompts[1])).toMatchSnapshot(
        'second-loop-system-prompt-no-planner',
      );
    });
  });
});
