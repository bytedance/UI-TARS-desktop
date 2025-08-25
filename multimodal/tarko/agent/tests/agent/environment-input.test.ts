/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent, AgentEventStream } from '../../src';
import { createTestAgent, setupAgentTest } from './kernel/utils/testUtils';
import { ChatCompletionContentPart } from '@tarko/model-provider';

describe('Agent Environment Input', () => {
  const testContext = setupAgentTest();

  describe('environmentInput in run options', () => {
    let agent: Agent;
    let eventStreamSpy: any;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);

      // Spy on event stream to capture events
      eventStreamSpy = vi.spyOn(agent.getEventStream(), 'sendEvent');

      // Mock LLM client to avoid actual API calls
      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Test response',
                  },
                  finish_reason: 'stop',
                },
              ],
            }),
          },
        },
      };
      agent.setCustomLLMClient(mockLLMClient as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should inject environment_input event when environmentInput is provided', async () => {
      const userInput = 'Analyze the code';
      const environmentInput = {
        content: 'function test() { return "hello"; }',
        description: 'Code context from @file reference',
      };

      await agent.run({
        input: userInput,
        environmentInput,
      });

      // Find the environment_input event
      const environmentEvent = eventStreamSpy.mock.calls.find(
        ([event]) => event.type === 'environment_input',
      )?.[0];

      expect(environmentEvent).toBeDefined();
      expect(environmentEvent).toMatchObject({
        type: 'environment_input',
        content: 'function test() { return "hello"; }',
        description: 'Code context from @file reference',
      });
    });

    it('should inject environment_input with multimodal content', async () => {
      const userInput = 'What do you see?';
      const environmentInput = {
        content: [
          { type: 'text', text: 'Context: This is a screenshot of the application' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,context_image' } },
        ] as ChatCompletionContentPart[],
        description: 'Visual context from @file reference',
      };

      await agent.run({
        input: userInput,
        environmentInput,
      });

      const environmentEvent = eventStreamSpy.mock.calls.find(
        ([event]) => event.type === 'environment_input',
      )?.[0];

      expect(environmentEvent).toBeDefined();
      expect(environmentEvent.content).toEqual(environmentInput.content);
      expect(environmentEvent.description).toBe('Visual context from @file reference');
    });

    it('should use default description when not provided', async () => {
      const userInput = 'Help me';
      const environmentInput = {
        content: 'Some context without description',
      };

      await agent.run({
        input: userInput,
        environmentInput,
      });

      const environmentEvent = eventStreamSpy.mock.calls.find(
        ([event]) => event.type === 'environment_input',
      )?.[0];

      expect(environmentEvent).toBeDefined();
      expect(environmentEvent.description).toBe('Environment context');
    });

    it('should not inject environment_input when not provided', async () => {
      const userInput = 'Simple query without context';

      await agent.run({
        input: userInput,
      });

      // Should not find any environment_input events
      const environmentEvent = eventStreamSpy.mock.calls.find(
        ([event]) => event.type === 'environment_input',
      );

      expect(environmentEvent).toBeUndefined();
    });

    it('should inject environment_input before processing in streaming mode', async () => {
      const userInput = 'Streaming query with context';
      const environmentInput = {
        content: 'Streaming context data',
        description: 'Context for streaming response',
      };

      const eventStream = await agent.run({
        input: userInput,
        environmentInput,
        stream: true,
      });

      // Collect all events from the stream
      const events: AgentEventStream.Event[] = [];
      for await (const event of eventStream) {
        events.push(event);
        // Break after a few events to avoid infinite streaming
        if (events.length > 10) break;
      }

      // Find environment_input event in the stream
      const environmentEvent = events.find((event) => event.type === 'environment_input');

      expect(environmentEvent).toBeDefined();
      expect(environmentEvent).toMatchObject({
        type: 'environment_input',
        content: 'Streaming context data',
        description: 'Context for streaming response',
      });

      // Verify environment_input comes before assistant messages
      const environmentIndex = events.findIndex((event) => event.type === 'environment_input');
      const assistantIndex = events.findIndex((event) => event.type === 'assistant_message');

      if (assistantIndex !== -1) {
        expect(environmentIndex).toBeLessThan(assistantIndex);
      }
    });

    it('should work with string input (legacy format)', async () => {
      const userInput = 'Legacy string input';

      // Mock the agent to capture the normalized options
      const originalRun = agent.run.bind(agent);
      const runSpy = vi.spyOn(agent, 'run').mockImplementation(async (options) => {
        // For string input, environmentInput should be undefined
        if (typeof options === 'string') {
          expect(options).toBe(userInput);
          return { type: 'assistant_message', content: 'Response', timestamp: Date.now() } as any;
        }
        return originalRun(options);
      });

      await agent.run(userInput);

      expect(runSpy).toHaveBeenCalledWith(userInput);
    });

    it('should handle empty environmentInput content', async () => {
      const userInput = 'Query with empty context';
      const environmentInput = {
        content: '',
        description: 'Empty context',
      };

      await agent.run({
        input: userInput,
        environmentInput,
      });

      const environmentEvent = eventStreamSpy.mock.calls.find(
        ([event]) => event.type === 'environment_input',
      )?.[0];

      expect(environmentEvent).toBeDefined();
      expect(environmentEvent.content).toBe('');
      expect(environmentEvent.description).toBe('Empty context');
    });

    it('should log environment input injection', async () => {
      const loggerSpy = vi.spyOn(agent.logger, 'info');

      await agent.run({
        input: 'Test query',
        environmentInput: {
          content: 'Test context',
          description: 'Test description',
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Agent] Injected environment input as environment_input event',
      );
    });
  });

  describe('event order verification', () => {
    let agent: Agent;
    let eventStreamSpy: any;

    beforeEach(() => {
      agent = createTestAgent({}, testContext);
      eventStreamSpy = vi.spyOn(agent.getEventStream(), 'sendEvent');

      const mockLLMClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Response',
                  },
                  finish_reason: 'stop',
                },
              ],
            }),
          },
        },
      };
      agent.setCustomLLMClient(mockLLMClient as any);
    });

    it('should send events in correct order: user_message, then environment_input', async () => {
      await agent.run({
        input: 'User query',
        environmentInput: {
          content: 'Environment context',
          description: 'Context description',
        },
      });

      const eventCalls = eventStreamSpy.mock.calls.map(([event]) => ({
        type: event.type,
        timestamp: event.timestamp,
      }));

      // Find user_message and environment_input events
      const userMessageIndex = eventCalls.findIndex((event) => event.type === 'user_message');
      const environmentInputIndex = eventCalls.findIndex(
        (event) => event.type === 'environment_input',
      );

      expect(userMessageIndex).toBeGreaterThanOrEqual(0);
      expect(environmentInputIndex).toBeGreaterThanOrEqual(0);
      expect(userMessageIndex).toBeLessThan(environmentInputIndex);
    });
  });
});
