/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';
import { Agent, Tool } from '../../src';
import { NativeToolCallEngine } from '../../src/tool-call-engine/NativeToolCallEngine';
import { MessageHistory } from '../../src/agent/message-history';
import { getLLMClient } from '../../src/agent/llm-client';
import { createLLMClient, resolveModel } from '@tarko/model-provider';
import {
  anthropicFixture,
  thinkingToolBlocks,
  finalBlocks,
} from '../../../model-provider/tests/fixtures/anthropic-thinking';

// Exercise the real Agent, LLMProcessor, native tool engine, SDK, and persisted history.
describe.each(['minimax', 'anthropic'] as const)(
  '%s thinking continuation in the agent',
  (provider) => {
    it.each([false, true])(
      'preserves signed blocks across tool execution and another turn (UI stream=%s)',
      async (stream) => {
        const fixture = await anthropicFixture([
          thinkingToolBlocks,
          finalBlocks,
          finalBlocks,
          finalBlocks,
        ]);
        try {
          const model = resolveModel({
            provider,
            id: '',
            baseURL: 'https://api.minimax.io/anthropic',
            apiKey: 'test-key',
          });
          const localModel = { ...model, baseURL: fixture.baseURL };
          const agent = new Agent({ model: localModel });
          // Redirect the resolved official route to localhost without re-resolving its protocol.
          agent.setCustomLLMClient(getLLMClient(localModel, { type: 'disabled' }));
          const lookup = vi.fn(async ({ query }: { query: string }) => `${query} result`);
          agent.registerTool(
            new Tool({
              id: 'lookup',
              description: 'Look up an item',
              parameters: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query'],
              },
              function: lookup,
            }),
          );
          if (stream) {
            const events = await agent.run({ input: 'Check two things', stream: true });
            for await (const _event of events) {
              /* consume the real stream */
            }
          } else {
            await agent.run('Check two things');
          }
          expect(lookup).toHaveBeenCalledTimes(2);
          expect(lookup.mock.calls.map(([args]) => args)).toEqual([
            { query: 'one' },
            { query: 'two' },
          ]);
          expect(fixture.requests).toHaveLength(2);
          expect(fixture.requests[1].body.messages[1]).toEqual({
            role: 'assistant',
            content: thinkingToolBlocks,
          });
          expect(fixture.requests[1].body.messages[2].content).toEqual([
            { type: 'tool_result', tool_use_id: 'tool_one', content: 'one result' },
            { type: 'tool_result', tool_use_id: 'tool_two', content: 'two result' },
          ]);
          const assistantEvents = agent
            .getEventStream()
            .getEvents()
            .filter((event) => event.type === 'assistant_message');
          expect(assistantEvents[0].anthropicContent).toEqual(thinkingToolBlocks);
          expect(assistantEvents[0].content).toBe('Checking.Again.');
          expect(assistantEvents[0].toolCalls).toHaveLength(2);
          expect(assistantEvents[1].anthropicContent).toEqual(finalBlocks);
          const reasoningEvents = agent
            .getEventStream()
            .getEvents()
            .filter(
              (event) =>
                event.type === 'assistant_thinking_message' ||
                event.type === 'assistant_streaming_thinking_message',
            );
          expect(reasoningEvents.some((event) => event.content.includes('First'))).toBe(true);
          expect(reasoningEvents.every((event) => !event.content.includes('signed-'))).toBe(true);
          await agent.run('What did you find?');
          expect(fixture.requests[2].body.messages[1].content).toEqual(thinkingToolBlocks);
          expect(fixture.requests[2].body.messages[3].content).toEqual(finalBlocks);

          // Rebuild after JSON persistence, without relying on an in-memory client cache.
          const savedEvents = JSON.parse(JSON.stringify(agent.getEventStream().getEvents()));
          const history = new MessageHistory({ getEvents: () => savedEvents } as any);
          const messages = history.toMessageHistory(new NativeToolCallEngine(), 'Continue');
          const freshClient = createLLMClient(localModel);
          await freshClient.chat.completions.create({ model: model.id, messages });
          expect(fixture.requests[3].body.messages[1].content).toEqual(thinkingToolBlocks);
          expect(
            fixture.requests.every((request) => request.body.model === 'MiniMax-M3.1-Flash'),
          ).toBe(true);
        } finally {
          await fixture.close();
        }
      },
    );
  },
);
