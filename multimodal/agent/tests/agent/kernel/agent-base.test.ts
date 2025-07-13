/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';

import {
  createTestAgent,
  setupAgentTest,
  createMockAssistantMessageEvent,
} from './utils/testUtils';
import { OpenAI } from 'model-provider/dist';

describe('Agent Base Methods', () => {
  const testContext = setupAgentTest();

  describe('loop termination controls', () => {
    it('should allow requesting loop termination', () => {
      const agent = createTestAgent({}, testContext);

      // Initially, termination should not be requested
      expect(agent.isLoopTerminationRequested()).toBe(false);

      // Request termination
      const result = agent.requestLoopTermination();

      // Should return true on first request
      expect(result).toBe(true);

      // Now termination should be requested
      expect(agent.isLoopTerminationRequested()).toBe(true);

      // Requesting again should return false
      const secondResult = agent.requestLoopTermination();
      expect(secondResult).toBe(false);
    });

    it('should reset termination flag on loop end', async () => {
      const agent = createTestAgent({}, testContext);

      // Request termination
      agent.requestLoopTermination();
      expect(agent.isLoopTerminationRequested()).toBe(true);

      // End the agent loop
      await agent.onAgentLoopEnd('test-session');

      // Termination flag should be reset
      expect(agent.isLoopTerminationRequested()).toBe(false);
    });

    it('should check termination with onBeforeLoopTermination', async () => {
      const agent = createTestAgent({}, testContext);

      // Create a mock assistant message event using the utility
      const mockAssistantEvent = createMockAssistantMessageEvent({
        content: 'Test content',
      });

      // Default implementation should allow termination
      const result = await agent.onBeforeLoopTermination('test-session', mockAssistantEvent);

      expect(result).toEqual({ finished: true });
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onAgentLoopEnd hook after execution', async () => {
      const agent = createTestAgent({}, testContext);
      const spy = vi.spyOn(agent, 'onAgentLoopEnd');

      // Trigger the hook directly
      await agent.onAgentLoopEnd('test-session');

      // Verify it was called
      expect(spy).toHaveBeenCalledWith('test-session');
    });

    it('should call onEachAgentLoopStart hook before iteration', async () => {
      const agent = createTestAgent({}, testContext);
      const spy = vi.spyOn(agent, 'onEachAgentLoopStart');

      // Trigger the hook directly
      await agent.onEachAgentLoopStart('test-session');

      // Verify it was called
      expect(spy).toHaveBeenCalledWith('test-session');
    });
  });

  describe('direct LLM call method', () => {
    it('should throw error when LLM client is not available', async () => {
      const agent = createTestAgent({}, testContext);

      // Mock getLLMClient to return undefined
      vi.spyOn(agent, 'getLLMClient').mockReturnValue(undefined);

      // Attempt to call LLM
      await expect(
        agent.callLLM({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow('LLM client is not available');
    });

    it('should throw error when resolved model is not available', async () => {
      const agent = createTestAgent({}, testContext);

      // Mock getLLMClient to return a valid client
      vi.spyOn(agent, 'getLLMClient').mockReturnValue({
        chat: {
          completions: {
            create: vi.fn(),
          },
        },
      } as unknown as OpenAI);

      // Mock getCurrentResolvedModel to return undefined
      vi.spyOn(agent, 'getCurrentResolvedModel').mockReturnValue(undefined);

      // Attempt to call LLM
      await expect(
        agent.callLLM({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).rejects.toThrow('Resolved model is not available');
    });

    it('should call LLM client with correct parameters when available', async () => {
      const agent = createTestAgent({}, testContext);

      // Mock the create function
      const createMock = vi.fn().mockResolvedValue({
        id: 'test-completion',
        choices: [{ message: { content: 'Test response' } }],
      });

      // Mock getLLMClient to return a valid client
      vi.spyOn(agent, 'getLLMClient').mockReturnValue({
        chat: {
          completions: {
            create: createMock,
          },
        },
      } as unknown as OpenAI);

      // Mock getCurrentResolvedModel to return a valid model
      vi.spyOn(agent, 'getCurrentResolvedModel').mockReturnValue({
        // @ts-expect-error
        provider: 'x',
        id: 'test-model',
        actualProvider: 'openai',
      });

      // Call LLM
      await agent.callLLM({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      });

      // Verify create was called with correct parameters
      expect(createMock).toHaveBeenCalledWith(
        {
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
        },
        undefined,
      );
    });
  });
});
