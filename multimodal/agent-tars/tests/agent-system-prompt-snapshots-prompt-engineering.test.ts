// /agent-tars/tests/agent-system-prompt-snapshots-prompt-engineering.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { OpenAI, ChatCompletionChunk } from '@mcp-agent/core';
import { AgentSnapshotNormalizer } from '../../agent-snapshot/src';
import { MockableAgentTARS, COMMON_MOCKS } from './utils/mock-agent';
import { normalizeSystemPromptForSnapshot } from './utils/normalizer';

// Setup snapshot normalizer
const normalizer = new AgentSnapshotNormalizer({});
expect.addSnapshotSerializer(normalizer.createSnapshotSerializer());

describe('Agent TARS System Prompt Snapshots - Prompt Engineering Mode', () => {
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

  describe('System Prompt Evolution with Prompt Engineering Tool Call Engine', () => {
    it('should capture system prompts for the first two loops with planner using prompt engineering', async () => {
      agent = new MockableAgentTARS({
        id: 'test-agent-pe',
        name: 'Test Agent TARS PE',
        instructions: 'You are a test assistant using prompt engineering for tool calls.',
        model: {
          provider: 'anthropic',
          id: 'claude-3-5-sonnet',
        },
        toolCallEngine: 'prompt_engineering',
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

      // Mock LLM client to simulate prompt engineering tool calls for multiple loops
      let callCount = 0;
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              callCount++;
              console.log(`[DEBUG PE] LLM call ${callCount}`);

              return {
                [Symbol.asyncIterator]: async function* () {
                  if (callCount === 1) {
                    // First loop: Create todos using prompt engineering format
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'I need to create a todo list to help you with this task.\n\n <tool_call>',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call in prompt engineering format
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            content: '\n{\n  "name": "create_todos",\n  "parameters": {\n',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            content:
                              '    "title": "Weather Information Search",\n    "todos": "- [ ] Search for weather information\\n- [ ] Analyze the search results",\n',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            content: '    "needsPlanning": true\n  }\n}\n</tool_call>',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-1',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
                    } as ChatCompletionChunk;
                  } else if (callCount === 2) {
                    // Second loop: Execute the plan with search using prompt engineering
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'Now I will execute the plan by searching for weather information.\n\n',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for web_search in prompt engineering format
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            content:
                              '<tool_call>\n{\n  "name": "web_search",\n  "parameters": {\n    "query": "weather today"\n  }\n}\n</tool_call>',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-2',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
                    } as ChatCompletionChunk;
                  } else if (callCount === 3) {
                    // Third loop: Update todos with completion using prompt engineering
                    yield {
                      id: 'mock-completion-3',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content: 'Let me update the todos with the completed steps.\n\n',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for edit_todos in prompt engineering format
                    const editTodosCall = `<tool_call>
{
  "name": "edit_todos",
  "parameters": {
    "thought": "1. WHAT: I am completing the weather search task by updating the todo list after successfully searching for weather information. 2. DUPLICATE CHECK: I am not repeating work - I just completed the web search and now updating progress. 3. WHY: I believe both tasks are complete because I executed the web_search tool and received weather results. My confidence level is 95 (out of 100). 4. REFLECTION: My judgment is thorough - I completed the search and have the information needed. 5. NEXT: I should provide the final answer to the user.",
    "todos": "- [x] Search for weather information\\n- [x] Analyze the search results"
  }
}
</tool_call>`;

                    // Split the tool call into smaller chunks to simulate realistic streaming
                    const chunks = editTodosCall.split('\n');
                    for (const chunk of chunks) {
                      yield {
                        id: 'mock-completion-3',
                        choices: [
                          {
                            delta: {
                              content: chunk + '\n',
                            },
                            finish_reason: null,
                          },
                        ],
                      } as ChatCompletionChunk;
                    }

                    yield {
                      id: 'mock-completion-3',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
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
                              'Based on my search and analysis, here is the weather information you requested. The todo list has been completed successfully using prompt engineering.',
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

      console.log('[DEBUG PE] Starting agent.run()');
      const response = await agent.run('Help me find information about the weather today.');
      console.log('[DEBUG PE] Agent run completed');
      expect(response.content).toMatchInlineSnapshot(
        `"Based on my search and analysis, here is the weather information you requested. The todo list has been completed successfully using prompt engineering."`,
      );

      const systemPrompts = agent.getSystemPrompts();
      const toolHistory = agent.getToolCallHistory();

      console.log(`[DEBUG PE] Total system prompts captured: ${systemPrompts.length}`);
      console.log(`[DEBUG PE] Tool calls made: ${toolHistory.length}`);

      console.log('toolHistory', toolHistory);

      // Verify web_search was mocked
      const searchCalls = toolHistory.filter((call) => call.toolName === 'web_search');

      console.log('searchCalls', searchCalls);

      expect(searchCalls).toHaveLength(1);
      expect(searchCalls[0].result).toEqual(COMMON_MOCKS.web_search.weather);

      // Verify we captured system prompts for at least 3 loops
      expect(systemPrompts.length).toBeGreaterThanOrEqual(3);

      // Snapshot the system prompts - these should include tool documentation in the prompt
      expect(normalizeSystemPromptForSnapshot(systemPrompts[0])).toMatchSnapshot(
        'first-loop-system-prompt-with-planner-pe',
      );
      expect(normalizeSystemPromptForSnapshot(systemPrompts[1])).toMatchSnapshot(
        'second-loop-system-prompt-with-planner-pe',
      );
      if (systemPrompts[2]) {
        expect(normalizeSystemPromptForSnapshot(systemPrompts[2])).toMatchSnapshot(
          'third-loop-system-prompt-with-planner-pe',
        );
      }
    });

    it('should capture system prompts without planner using prompt engineering', async () => {
      agent = new MockableAgentTARS({
        id: 'test-agent-no-planner-pe',
        name: 'Test Agent TARS PE No Planner',
        toolCallEngine: 'prompt_engineering',
        model: {
          provider: 'anthropic',
          id: 'claude-3-5-sonnet',
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

      // Mock LLM for simpler case without planner using prompt engineering
      let callCount = 0;
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              callCount++;

              return {
                [Symbol.asyncIterator]: async function* () {
                  if (callCount === 1) {
                    // First loop: Search using prompt engineering format
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'I will search for weather information using prompt engineering.\n\n',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Tool call for web_search in prompt engineering format (streamed)
                    const toolCall =
                      '<tool_call>\n{\n  "name": "web_search",\n  "parameters": {\n    "query": "weather today"\n  }\n}\n</tool_call>';

                    // Stream the tool call character by character to test streaming parsing
                    for (const char of toolCall) {
                      yield {
                        id: 'mock-completion-1',
                        choices: [
                          {
                            delta: {
                              content: char,
                            },
                            finish_reason: null,
                          },
                        ],
                      } as ChatCompletionChunk;
                    }

                    yield {
                      id: 'mock-completion-1',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
                    } as ChatCompletionChunk;
                  } else {
                    // Second loop: Final answer
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'Based on my search using prompt engineering, here is the weather information.',
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
        `"Based on my search using prompt engineering, here is the weather information."`,
      );

      const systemPrompts = agent.getSystemPrompts();
      const toolHistory = agent.getToolCallHistory();
      console.log('[DEBUG PE] toolHistory', toolHistory);

      // Verify dynamic mock worked
      const searchCalls = toolHistory.filter((call) => call.toolName === 'web_search');
      expect(searchCalls).toHaveLength(1);
      expect(searchCalls[0].args.query).toBe('weather today');
      expect(searchCalls[0].result.pages[0].title).toContain('weather today');

      // Verify we captured system prompts for both loops
      expect(systemPrompts).toHaveLength(2);

      // Snapshot the system prompts - these should show tool documentation inline
      expect(systemPrompts[0]).toMatchSnapshot('first-loop-system-prompt-no-planner-pe');
      expect(systemPrompts[1]).toMatchSnapshot('second-loop-system-prompt-no-planner-pe');
    });

    it('should capture system prompts with browser control modes using prompt engineering', async () => {
      agent = new MockableAgentTARS({
        id: 'test-agent-browser-pe',
        name: 'Test Agent TARS Browser PE',
        toolCallEngine: 'prompt_engineering',
        model: {
          provider: 'anthropic',
          id: 'claude-3-5-sonnet',
        },
        browser: {
          type: 'local',
          headless: true,
          control: 'visual-grounding', // Different browser control mode
        },
        search: {
          provider: 'browser_search',
          count: 3,
        },
        workspace: {
          workingDirectory: resolve(__dirname, '.test-workspace'),
        },
        mcpImpl: 'in-memory',
        maxIterations: 3,
      });

      // Setup mock for browser navigation
      agent.setMockResult('browser_navigate', { status: 'success', url: 'https://weather.com' });

      let callCount = 0;
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              callCount++;

              return {
                [Symbol.asyncIterator]: async function* () {
                  if (callCount === 1) {
                    // First loop: Browser navigation using prompt engineering
                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'I will navigate to a weather website using visual grounding.\n\n',
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    // Browser navigation tool call in prompt engineering format
                    const browserCall =
                      '<tool_call>\n{\n  "name": "browser_navigate",\n  "parameters": {\n    "url": "https://weather.com"\n  }\n}\n</tool_call>';

                    yield {
                      id: 'mock-completion-1',
                      choices: [
                        {
                          delta: {
                            content: browserCall,
                          },
                          finish_reason: null,
                        },
                      ],
                    } as ChatCompletionChunk;

                    yield {
                      id: 'mock-completion-1',
                      choices: [{ delta: {}, finish_reason: 'stop' }],
                    } as ChatCompletionChunk;
                  } else {
                    // Second loop: Final answer
                    yield {
                      id: 'mock-completion-2',
                      choices: [
                        {
                          delta: {
                            role: 'assistant',
                            content:
                              'Successfully navigated to the weather website using visual grounding browser control.',
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
      const response = await agent.run('Navigate to a weather website.');
      expect(response.content).toMatchInlineSnapshot(
        `"Successfully navigated to the weather website using visual grounding browser control."`,
      );

      const systemPrompts = agent.getSystemPrompts();
      const toolHistory = agent.getToolCallHistory();

      // Verify browser navigation was mocked
      const browserCalls = toolHistory.filter((call) => call.toolName === 'browser_navigate');
      expect(browserCalls).toHaveLength(1);
      expect(browserCalls[0].result).toEqual({ status: 'success', url: 'https://weather.com' });

      // Verify we captured system prompts
      expect(systemPrompts).toHaveLength(2);

      // Snapshot the system prompts - should show visual-grounding browser rules
      expect(systemPrompts[0]).toMatchSnapshot(
        'first-loop-system-prompt-browser-visual-grounding-pe',
      );
      expect(systemPrompts[1]).toMatchSnapshot(
        'second-loop-system-prompt-browser-visual-grounding-pe',
      );
    });
  });

  describe('Tool Documentation Differences in Prompt Engineering', () => {
    it('should show inline tool documentation in system prompts', async () => {
      agent = new MockableAgentTARS({
        id: 'test-agent-tool-docs-pe',
        name: 'Test Agent TARS Tool Docs PE',
        toolCallEngine: 'prompt_engineering',
        model: {
          provider: 'anthropic',
          id: 'claude-3-5-sonnet',
        },
        browser: {
          type: 'local',
          headless: true,
          control: 'dom', // DOM-only mode for cleaner tool list
        },
        search: {
          provider: 'browser_search',
          count: 2,
        },
        workspace: {
          workingDirectory: resolve(__dirname, '.test-workspace'),
        },
        mcpImpl: 'in-memory',
        maxIterations: 2,
      });

      // Simple mock to ensure we get at least one loop
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async () => {
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield {
                    id: 'mock-completion',
                    choices: [
                      {
                        delta: {
                          role: 'assistant',
                          content: 'I understand the available tools for prompt engineering mode.',
                        },
                        finish_reason: null,
                      },
                    ],
                  } as ChatCompletionChunk;

                  yield {
                    id: 'mock-completion',
                    choices: [{ delta: {}, finish_reason: 'stop' }],
                  } as ChatCompletionChunk;
                },
              };
            }),
          },
        },
      } as unknown as OpenAI;

      agent.setCustomLLMClient(mockLLMClient);
      await agent.initialize();
      const response = await agent.run('Show me the available tools.');
      expect(response.content).toMatchInlineSnapshot(
        `"I understand the available tools for prompt engineering mode."`,
      );

      const systemPrompts = agent.getSystemPrompts();

      // Should have captured at least one system prompt
      expect(systemPrompts).toHaveLength(1);

      // This snapshot should show the tool documentation embedded in the system prompt
      // rather than using the native function calling format
      expect(systemPrompts[0]).toMatchSnapshot('tool-documentation-inline-pe');
    });
  });
});
