/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent, Tool, AgentStatus } from '../../../src';
import { AgentEventStreamProcessor } from '../../../src/agent/event-stream';
import { OpenAI, z } from '@tarko/model-provider';
import { createTestAgent, setupAgentTest } from './utils/testUtils';

describe('Agent', () => {
  const testContext = setupAgentTest();

  describe('initialization', () => {
    it('should create a valid Agent instance', () => {
      const agent = createTestAgent({}, testContext);
      expect(agent).toBeInstanceOf(Agent);
    });

    it('should initialize with correct default options', () => {
      // Create an agent with default options
      const agent = createTestAgent(undefined, testContext);

      // Take a snapshot of the options
      expect(agent.getOptions()).toMatchInlineSnapshot(`{}`);
    });

    it('should override default options when provided', () => {
      // Create an agent with custom options
      const agent = createTestAgent(
        {
          toolCallEngine: 'native',
          maxIterations: 5,
          temperature: 0.5,
        },
        testContext,
      );

      // Verify specific options were set correctly
      expect(agent.getOptions().toolCallEngine).toBe('native');
      expect(agent.getOptions().maxIterations).toBe(5);
      expect(agent.getOptions().temperature).toBe(0.5);
    });

    it('should use custom name and id when provided', () => {
      const agent = createTestAgent(
        {
          name: 'TestAgent',
          id: 'test-agent-123',
        },
        testContext,
      );

      // These properties are private, but we can verify them indirectly
      expect(agent.getOptions().name).toBe('TestAgent');
      expect(agent.getOptions().id).toBe('test-agent-123');
    });
  });

  describe('tool management', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
    });

    it('should register and retrieve tools', () => {
      // Create a mock tool
      const mockTool: Tool = {
        name: 'testTool',
        description: 'A test tool',
        schema: z.object({
          param1: z.string().describe('Parameter 1'),
        }),
        function: vi.fn(),
        hasZodSchema: () => true,
        hasJsonSchema: () => false,
      };

      // Register tool
      agent.registerTool(mockTool);

      // Get registered tools and verify
      const tools = agent.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('testTool');
      expect(tools[0].description).toBe('A test tool');
    });

    it('should register multiple tools and retrieve them all', () => {
      // Create mock tools
      const mockTool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        schema: z.object({}),
        function: vi.fn(),
        hasZodSchema: () => true,
        hasJsonSchema: () => false,
      };

      const mockTool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        schema: z.object({}),
        function: vi.fn(),
        hasZodSchema: () => true,
        hasJsonSchema: () => false,
      };

      // Register tools
      agent.registerTool(mockTool1);
      agent.registerTool(mockTool2);

      // Verify tools were registered
      const tools = agent.getTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(['tool1', 'tool2']);
    });
  });

  describe('LLM client management', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
    });

    it('should set and get custom LLM client', () => {
      // Create a mock LLM client
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn(),
          },
        },
      } as unknown as OpenAI;

      // Set custom LLM client
      agent.setCustomLLMClient(mockLLMClient);

      // Verify the client was set
      expect(agent.getLLMClient()).toBe(mockLLMClient);
    });

    it('should handle initial resolved model correctly', () => {
      // Initially, no resolved model should be available
      expect(agent.getCurrentResolvedModel()).toMatchInlineSnapshot(`
        {
          "actualProvider": "openai",
          "apiKey": undefined,
          "baseURL": undefined,
          "displayName": undefined,
          "id": "gpt-4o",
          "provider": "openai",
        }
      `);
    });
  });

  describe('execution control', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
    });

    it('should report correct status', () => {
      // Initially, status should be IDLE
      expect(agent.status()).toBe(AgentStatus.IDLE);
    });

    it('should not abort when not running', () => {
      // Attempt to abort when not running
      const abortResult = agent.abort();

      // Should return false since nothing to abort
      expect(abortResult).toBe(false);
      expect(agent.status()).toBe(AgentStatus.IDLE);
    });

    it('should get current loop iteration', () => {
      // Initially, iteration should be 0 (or 1 if already initialized)
      const iteration = agent.getCurrentLoopIteration();
      expect(iteration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('event stream', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
    });

    it('should provide event stream', () => {
      const eventStream = agent.getEventStream();
      expect(eventStream).toBeDefined();
      expect(eventStream).toBeInstanceOf(AgentEventStreamProcessor);
    });

    it('should allow subscribing to event stream', () => {
      const eventStream = agent.getEventStream();
      const mockSubscriber = vi.fn();

      // Subscribe to events
      const unsubscribe = eventStream.subscribe(mockSubscriber);
      expect(typeof unsubscribe).toBe('function');

      // Clean up
      unsubscribe();
    });
  });

  describe('summary generation', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
    });

    it('should handle summary generation errors gracefully', async () => {
      // Mock getLLMClient to return undefined (no client available)
      vi.spyOn(agent, 'getLLMClient').mockReturnValue(undefined);

      // Attempt to generate summary without a client
      await expect(
        agent.generateSummary({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow('LLM client not available');
    });
  });

  describe('hooks and callbacks', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
    });

    it('should call onLLMRequest hook with correct parameters', () => {
      // Spy on the onLLMRequest method
      const spy = vi.spyOn(agent, 'onLLMRequest');

      // Trigger the hook (this is normally done internally during run())
      agent.onLLMRequest('test-session', {
        provider: 'test',
        request: { messages: [] },
      });

      // Verify the hook was called with correct parameters
      expect(spy).toHaveBeenCalledWith('test-session', {
        provider: 'test',
        request: { messages: [] },
      });
    });

    it('should call onLLMResponse hook with correct parameters', () => {
      // Spy on the onLLMResponse method
      const spy = vi.spyOn(agent, 'onLLMResponse');

      // Trigger the hook
      agent.onLLMResponse('test-session', {
        provider: 'test',
        response: { id: '123', choices: [] } as any,
      });

      // Verify the hook was called with correct parameters
      expect(spy).toHaveBeenCalledWith('test-session', {
        provider: 'test',
        response: { id: '123', choices: [] },
      });
    });

    it('should call onBeforeToolCall and onAfterToolCall hooks', async () => {
      // Spy on the hooks
      const beforeSpy = vi.spyOn(agent, 'onBeforeToolCall');
      const afterSpy = vi.spyOn(agent, 'onAfterToolCall');

      // Trigger the hooks
      await agent.onBeforeToolCall(
        'test-session',
        { toolCallId: '123', name: 'testTool' },
        { arg1: 'value1' },
      );
      await agent.onAfterToolCall(
        'test-session',
        { toolCallId: '123', name: 'testTool' },
        { result: 'success' },
      );

      // Verify the hooks were called with correct parameters
      expect(beforeSpy).toHaveBeenCalledWith(
        'test-session',
        { toolCallId: '123', name: 'testTool' },
        { arg1: 'value1' },
      );
      expect(afterSpy).toHaveBeenCalledWith(
        'test-session',
        { toolCallId: '123', name: 'testTool' },
        { result: 'success' },
      );
    });
  });
});
