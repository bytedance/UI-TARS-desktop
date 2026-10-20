/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';
import { resolveModel } from '../src/model-resolver';
import { getLLMClient } from '../../agent/src/agent/llm-client';
import type { AnthropicContinuation } from '../src/types';
import { anthropicFixture, thinkingToolBlocks, finalBlocks } from './fixtures/anthropic-thinking';
vi.mock('@tarko/model-provider', async () => import('../src/index'));
vi.mock('@tarko/shared-utils', () => ({ getLogger: () => ({ info: vi.fn() }) }));

const input = [
  {
    role: 'user' as const,
    content: [
      { type: 'text' as const, text: 'Check two things' },
      { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,aGVsbG8=' } },
    ],
  },
];

describe.each(['https://api.minimax.io', 'https://api.minimaxi.com'])(
  '%s native thinking',
  (origin) => {
    it.each([false, true])(
      'round-trips signed blocks, text and tools (stream=%s)',
      async (stream) => {
        const fixture = await anthropicFixture([thinkingToolBlocks, finalBlocks]);
        try {
          const model = resolveModel({
            provider: 'minimax',
            id: '',
            baseURL: `${origin}/anthropic`,
            apiKey: 'test-key',
          });
          expect(model.id).toBe('MiniMax-M3.1-Flash');
          expect(model.baseProvider).toBe('anthropic');
          const client = getLLMClient({ ...model, baseURL: fixture.baseURL }, { type: 'disabled' });
          const selection = {
            tools: [
              {
                type: 'function' as const,
                function: {
                  name: 'lookup',
                  parameters: { type: 'object', properties: { query: { type: 'string' } } },
                },
              },
            ],
            tool_choice: { type: 'function' as const, function: { name: 'lookup' } },
          };
          let assistant: any;
          if (stream) {
            const response = await client.chat.completions.create({
              model: model.id,
              messages: input,
              ...selection,
              stream: true,
            });
            let text = '',
              thinking = '';
            let native: AnthropicContinuation['anthropic_content'];
            const tools = new Map<number, any>();
            let finish: string | null = null;
            let usage;
            for await (const chunk of response) {
              const delta = chunk.choices[0].delta as (typeof chunk.choices)[0]['delta'] &
                AnthropicContinuation;
              text += delta.content ?? '';
              thinking += delta.reasoning_content ?? '';
              native = delta.anthropic_content ?? native;
              finish = chunk.choices[0].finish_reason ?? finish;
              usage = chunk.usage ?? usage;
              for (const tool of delta.tool_calls ?? []) {
                if (tool.id)
                  tools.set(tool.index, {
                    id: tool.id,
                    type: 'function',
                    function: { name: tool.function?.name, arguments: '' },
                  });
                tools.get(tool.index).function.arguments += tool.function?.arguments ?? '';
              }
            }
            expect([...tools.keys()]).toEqual([0, 1]);
            expect(text).toBe('Checking.Again.');
            expect(thinking).toBe('First reasonNext reason');
            expect(finish).toBe('tool_calls');
            expect(usage).toMatchObject({
              prompt_tokens: 7,
              completion_tokens: 11,
              total_tokens: 18,
            });
            assistant = {
              role: 'assistant',
              content: text,
              tool_calls: [...tools.values()],
              anthropic_content: native,
            };
          } else {
            const response = await client.chat.completions.create({
              model: model.id,
              messages: input,
              ...selection,
            });
            assistant = response.choices[0].message;
            expect(assistant.content).toBe('Checking.\nAgain.');
            expect(assistant.reasoning_content).toBe('First reasonNext reason');
            expect(response.choices[0].finish_reason).toBe('tool_calls');
          }
          expect(assistant.anthropic_content).toEqual(thinkingToolBlocks);
          expect(
            assistant.tool_calls.map((tool: any) => [tool.id, JSON.parse(tool.function.arguments)]),
          ).toEqual([
            ['tool_one', { query: 'one' }],
            ['tool_two', { query: 'two' }],
          ]);
          // Simulate persisted SDK history, including opaque signatures/redacted blocks.
          const saved = JSON.parse(JSON.stringify(assistant));
          await client.chat.completions.create({
            model: model.id,
            messages: [
              ...input,
              saved,
              { role: 'tool', tool_call_id: 'tool_one', content: 'one result' },
              { role: 'tool', tool_call_id: 'tool_two', content: 'two result' },
            ],
          });
          expect(fixture.requests[1].body.messages[0].content).toEqual([
            { type: 'text', text: 'Check two things' },
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' },
            },
          ]);
          expect(fixture.requests[1].body.messages[1]).toEqual({
            role: 'assistant',
            content: thinkingToolBlocks,
          });
          expect(fixture.requests[1].body.messages[2].content).toEqual([
            { type: 'tool_result', tool_use_id: 'tool_one', content: 'one result' },
            { type: 'tool_result', tool_use_id: 'tool_two', content: 'two result' },
          ]);
          for (const request of fixture.requests) {
            expect(request.path).toBe('/anthropic/v1/messages');
            expect(request.body).not.toHaveProperty('thinking');
          }
        } finally {
          await fixture.close();
        }
      },
    );
  },
);

it.each([false, true])('keeps ordinary Claude text/tool behavior (stream=%s)', async (stream) => {
  const blocks = thinkingToolBlocks.filter(
    (block) => block.type === 'text' || block.type === 'tool_use',
  );
  const fixture = await anthropicFixture([blocks]);
  try {
    const model = resolveModel({
      provider: 'anthropic',
      id: 'claude-3-5-sonnet-latest',
      baseURL: fixture.baseURL,
      apiKey: 'test-key',
    });
    const client = getLLMClient(model, { type: 'disabled' });
    if (stream) {
      const response = await client.chat.completions.create({
        model: model.id,
        messages: input,
        stream: true,
      });
      const indices: number[] = [];
      for await (const chunk of response) {
        const delta = chunk.choices[0].delta;
        expect(delta).not.toHaveProperty('anthropic_content');
        expect(delta).not.toHaveProperty('reasoning_content');
        for (const tool of delta.tool_calls ?? []) if (tool.id) indices.push(tool.index);
      }
      expect(indices).toEqual([0, 1]);
    } else {
      const response = await client.chat.completions.create({ model: model.id, messages: input });
      expect(response.choices[0].message.tool_calls).toHaveLength(2);
      expect(response.choices[0].message).not.toHaveProperty('anthropic_content');
    }
    expect(fixture.requests[0].body.model).toBe('claude-3-5-sonnet-latest');
  } finally {
    await fixture.close();
  }
});
