/* eslint-disable @typescript-eslint/no-explicit-any */
import { AgentTARS } from '../../src/agent-tars';
import {
  ChatCompletionMessageToolCall,
  ToolCallResult,
  PrepareRequestContext,
  PrepareRequestResult,
} from '@mcp-agent/core';

/**
 * Enhanced mock configuration for tool calls
 */
export interface MockToolConfig {
  /** Static result to return */
  result?: any;
  /** Dynamic result based on tool call arguments */
  dynamicResult?: (args: any) => any;
  /** Whether to delay the mock result */
  delay?: number;
  /** Whether to throw an error */
  shouldError?: boolean;
  /** Error message if shouldError is true */
  errorMessage?: string;
}

/**
 * Mockable AgentTARS for testing purposes
 * Extends AgentTARS with tool mocking capabilities and system prompt capture
 */
export class MockableAgentTARS extends AgentTARS {
  private mockConfigs: Map<string, MockToolConfig> = new Map();
  private systemPrompts: string[] = [];
  private toolCallHistory: Array<{
    toolName: string;
    args: any;
    result: any;
    timestamp: number;
  }> = [];

  /**
   * Set mock configuration for a specific tool
   */
  setMockConfig(toolName: string, config: MockToolConfig) {
    this.mockConfigs.set(toolName, config);
  }

  /**
   * Set simple mock result for a tool
   */
  setMockResult(toolName: string, result: any) {
    this.setMockConfig(toolName, { result });
  }

  /**
   * Set dynamic mock based on arguments
   */
  setDynamicMock(toolName: string, handler: (args: any) => any) {
    this.setMockConfig(toolName, { dynamicResult: handler });
  }

  /**
   * Clear all mock configurations
   */
  clearMocks() {
    this.mockConfigs.clear();
  }

  /**
   * Get captured system prompts
   */
  getSystemPrompts(): string[] {
    return [...this.systemPrompts];
  }

  /**
   * Clear system prompts
   */
  clearSystemPrompts() {
    this.systemPrompts = [];
  }

  /**
   * Get tool call history
   */
  getToolCallHistory() {
    return [...this.toolCallHistory];
  }

  /**
   * Clear tool call history
   */
  clearToolCallHistory() {
    this.toolCallHistory = [];
  }

  /**
   * Override to capture system prompts
   */
  override onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
    const enhanced = super.onPrepareRequest(context);
    this.systemPrompts.push(enhanced.systemPrompt);
    console.log(`[MockAgent] System prompt captured for loop ${this.systemPrompts.length}`);
    return enhanced;
  }

  /**
   * Override to mock tool calls
   */
  override onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): ToolCallResult[] | undefined {
    // Check if any of the tool calls need mocking
    const hasMockableTools = toolCalls.some((tc) => this.mockConfigs.has(tc.function.name));

    if (!hasMockableTools) {
      return undefined; // Let tools execute normally
    }

    return toolCalls.map((toolCall) => {
      const toolName = toolCall.function.name;
      const mockConfig = this.mockConfigs.get(toolName);

      if (!mockConfig) {
        // No mock configured, let it execute normally
        // But since we're in a batch processing, we need to return something
        return {
          toolCallId: toolCall.id,
          toolName,
          content: `No mock configured for ${toolName}`,
        };
      }

      // Parse arguments
      let args: any = {};
      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        console.warn(
          `[MockAgent] Failed to parse arguments for ${toolName}:`,
          toolCall.function.arguments,
        );
      }

      // Handle error simulation
      if (mockConfig.shouldError) {
        console.log(`[MockAgent] Simulating error for tool call: ${toolName}`);
        return {
          toolCallId: toolCall.id,
          toolName,
          content: `Error: ${mockConfig.errorMessage || 'Simulated tool error'}`,
          isError: true,
        };
      }

      // Generate result
      let result: any;
      if (mockConfig.dynamicResult) {
        result = mockConfig.dynamicResult(args);
        console.log(`[MockAgent] Dynamic mock result for ${toolName}:`, result);
      } else {
        result = mockConfig.result;
        console.log(`[MockAgent] Static mock result for ${toolName}:`, result);
      }

      // Record tool call in history
      this.toolCallHistory.push({
        toolName,
        args,
        result,
        timestamp: Date.now(),
      });

      return {
        toolCallId: toolCall.id,
        toolName,
        content: result,
      };
    });
  }
}

/**
 * Common mock configurations for testing
 */
export const COMMON_MOCKS = {
  web_search: {
    weather: {
      pages: [
        {
          title: 'Weather Today - Mock Result',
          url: 'https://example-weather.com',
          snippet: "Today's weather forecast shows sunny conditions with temperatures around 22°C.",
          content:
            'Detailed weather information for today includes sunny skies, light winds, and comfortable temperatures.',
        },
        {
          title: 'Local Weather Report - Mock',
          url: 'https://local-weather.com',
          snippet: 'Current weather conditions in your area show clear skies.',
          content: 'Extended weather report with hourly and daily forecasts.',
        },
      ],
    },

    general: (args: { query: string }) => ({
      pages: [
        {
          title: `Mock Search Result for: ${args.query}`,
          url: 'https://mock-search.com',
          snippet: `Mock search results for query: "${args.query}"`,
          content: `This is mock content for the search query: ${args.query}`,
        },
      ],
    }),
  },

  browser_navigate: {
    success: {
      status: 'success',
      url: 'https://mock-page.com',
      message: 'Navigation successful (mocked)',
    },
  },

  browser_get_markdown: {
    content: 'Mock page content in markdown format',
    title: 'Mock Page Title',
  },
};
