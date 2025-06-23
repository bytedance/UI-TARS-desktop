/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../../../src';
import type { AgentOptions } from '../../../../src';

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
