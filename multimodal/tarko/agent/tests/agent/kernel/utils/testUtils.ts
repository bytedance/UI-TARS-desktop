/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi, beforeEach, afterEach } from 'vitest';
import { Agent, AgentEventStream } from '../../../../src';
import type { AgentOptions } from '../../../../src';
import { ChatCompletionMessageToolCall } from '@tarko/model-provider';

/**
 * Utility type for deep partial objects
 * Allows creating partial mocks of complex objects
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Test context to store test-specific data and utilities
 */
export interface TestContext {
  agent: Agent | null;
  mocks: Record<string, any>;
  cleanup: Array<() => void>;
}

/**
 * Creates a clean test context for each test
 */
export function createTestContext(): TestContext {
  return {
    agent: null,
    mocks: {},
    cleanup: [],
  };
}

/**
 * Creates an Agent instance for testing with optional overrides
 */
export function createTestAgent(
  options?: DeepPartial<AgentOptions>,
  context: TestContext = createTestContext(),
): Agent {
  const agent = new Agent(options as AgentOptions);
  context.agent = agent;
  return agent;
}

/**
 * Registers a cleanup function to be called after test
 */
export function registerCleanup(fn: () => void, context: TestContext): void {
  context.mocks[fn.name || `cleanup_${context.cleanup.length}`] = fn;
  context.cleanup.push(fn);
}

/**
 * Performs all registered cleanup operations
 */
export function cleanupTest(context: TestContext): void {
  context.cleanup.forEach((cleanup) => cleanup());
  context.cleanup = [];
  context.agent = null;
}

/**
 * Provides automatic test setup and teardown via beforeEach/afterEach
 */
export function setupAgentTest(): TestContext {
  const context = createTestContext();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTest(context);
  });

  return context;
}

/**
 * Wait some time.
 */
export function sleep(time: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

/**
 * Creates a mock AgentEventStream.AssistantMessageEvent for testing
 */
export function createMockAssistantMessageEvent(
  overrides: Partial<AgentEventStream.AssistantMessageEvent> = {},
): AgentEventStream.AssistantMessageEvent {
  const defaultEvent: AgentEventStream.AssistantMessageEvent = {
    id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: 'assistant_message',
    timestamp: Date.now(),
    content: 'Test assistant response',
    finishReason: 'stop',
  };

  return { ...defaultEvent, ...overrides };
}

/**
 * Creates a mock AgentEventStream.AssistantMessageEvent with tool calls for testing
 */
export function createMockAssistantMessageEventWithToolCalls(
  toolCalls: ChatCompletionMessageToolCall[],
  overrides: Partial<AgentEventStream.AssistantMessageEvent> = {},
): AgentEventStream.AssistantMessageEvent {
  return createMockAssistantMessageEvent({
    content: 'I need to use tools to help you',
    toolCalls,
    finishReason: 'tool_calls',
    ...overrides,
  });
}

/**
 * Creates a mock tool call for testing
 */
export function createMockToolCall(
  name = 'testTool',
  args: Record<string, any> = {},
  id?: string,
): ChatCompletionMessageToolCall {
  return {
    id: id || `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  };
}

/**
 * Creates multiple mock tool calls for testing
 */
export function createMockToolCalls(
  toolConfigs: Array<{ name: string; args?: Record<string, any>; id?: string }>,
): ChatCompletionMessageToolCall[] {
  return toolConfigs.map(({ name, args = {}, id }) => createMockToolCall(name, args, id));
}

/**
 * Creates a mock MultimodalToolCallResult for testing
 */
export function createMockToolCallResult(
  toolCallId: string,
  toolName: string,
  textResult: string,
  imageUrl?: string,
) {
  const content: any[] = [
    {
      type: 'text',
      text: textResult,
    },
  ];

  if (imageUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: imageUrl,
      },
    });
  }

  return {
    toolCallId,
    toolName,
    content,
  };
}
