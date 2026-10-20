/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLLMClient } from '../src/llm-client';
import { resolveModel } from '../src/model-resolver';
import { getLLMClient } from '../../agent/src/agent/llm-client';

// Exercise the agent's real request interceptor with this package's source.
vi.mock('@tarko/model-provider', async () => import('../src/index'));
vi.mock('@tarko/shared-utils', () => ({ getLogger: () => ({ info: vi.fn() }) }));

const closeServers: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closeServers.splice(0).map((close) => close()));
});

async function transport(protocol: 'openai' | 'anthropic') {
  const requests: Array<{ path: string; body: Record<string, any> }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString());
    requests.push({ path: request.url ?? '', body });
    if (body.stream) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' });
      if (protocol === 'openai') {
        response.end(
          `data: ${JSON.stringify({ id: 'chatcmpl-test', object: 'chat.completion.chunk', created: 0, model: body.model, choices: [{ index: 0, delta: { content: 'ok', reasoning_content: 'Thinking' }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`,
        );
      } else {
        const events = [
          {
            type: 'message_start',
            message: {
              id: 'msg_test',
              type: 'message',
              role: 'assistant',
              model: body.model,
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 1, output_tokens: 0 },
            },
          },
          { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
          { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ok' } },
          { type: 'content_block_stop', index: 0 },
          {
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: 1 },
          },
          { type: 'message_stop' },
        ];
        response.end(
          events
            .map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
            .join(''),
        );
      }
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify(
        protocol === 'anthropic'
          ? {
              id: 'msg_test',
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: 'ok' }],
              model: body.model,
              stop_reason: 'end_turn',
              stop_sequence: null,
              usage: { input_tokens: 1, output_tokens: 1 },
            }
          : {
              id: 'chatcmpl-test',
              object: 'chat.completion',
              created: 0,
              model: body.model,
              choices: [
                { index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            },
      ),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  closeServers.push(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const { port } = server.address() as AddressInfo;
  return { baseURL: `http://127.0.0.1:${port}`, requests };
}

const messages = [{ role: 'user' as const, content: 'Hello' }];
const flash = 'MiniMax-M3.1-Flash';

describe('MiniMax serialized requests', () => {
  it('uses Flash when only the MiniMax runtime provider is selected', () => {
    expect(resolveModel(undefined, undefined, 'minimax').id).toBe(flash);
    expect(resolveModel().id).toBe('gpt-4o');
  });

  describe.each(['https://api.minimax.io', 'https://api.minimaxi.com'])('%s', (origin) => {
    it.each(['', flash, 'MiniMax-M3', 'MiniMax-M2.7', 'custom-model'])(
      'preserves the resolved OpenAI-compatible model %s at the agent transport boundary',
      async (id) => {
        const fixture = await transport('openai');
        const model = resolveModel({
          provider: 'minimax',
          id,
          baseURL: origin === 'https://api.minimax.io' ? undefined : `${origin}/v1`,
          apiKey: 'test-key',
        });
        expect(model.baseURL).toBe(`${origin}/v1`);
        const expectedModel = id || flash;
        const client = getLLMClient(
          { ...model, baseURL: `${fixture.baseURL}/v1` },
          { type: 'disabled' },
        );
        await client.chat.completions.create({ model: model.id, messages });
        expect(fixture.requests).toHaveLength(1);
        expect(fixture.requests[0].path).toBe('/v1/chat/completions');
        expect(fixture.requests[0].body.model).toBe(expectedModel);
        expect(fixture.requests[0].body.messages).toEqual(messages);
        if (expectedModel === flash) {
          expect(fixture.requests[0].body).not.toHaveProperty('thinking');
          expect(fixture.requests[0].body).not.toHaveProperty('reasoning_effort');
          expect(fixture.requests[0].body).not.toHaveProperty('service_tier');
          expect(fixture.requests[0].body).not.toHaveProperty('reasoning_split');
        }
      },
    );

    it.each(['minimax', 'anthropic'] as const)(
      'defaults %s on the known Anthropic endpoint to M3 at the SDK boundary',
      async (provider) => {
        const fixture = await transport('anthropic');
        for (const suffix of ['', '/']) {
          const model = resolveModel({
            provider,
            id: '',
            baseURL: `${origin}/anthropic${suffix}`,
            apiKey: 'test-key',
          });
          expect(model.id).toBe('MiniMax-M3');
          expect(model.baseProvider).toBe('anthropic');
          expect(model.baseURL).toBe(`${origin}/anthropic${suffix}`);
          const client = getLLMClient(
            { ...model, baseURL: `${fixture.baseURL}/anthropic${suffix}` },
            { type: 'disabled' },
          );
          const response = await client.chat.completions.create({ model: model.id, messages });
          expect(response.choices[0].message.content).toBe('ok');
          const request = fixture.requests.at(-1)!;
          expect(request.path).toBe('/anthropic/v1/messages');
          expect(request.body.model).toBe('MiniMax-M3');
          expect(request.body).not.toHaveProperty('thinking');
        }
      },
    );

    it.each([flash, 'MiniMax-M3', 'MiniMax-M2.7', 'custom-model'])(
      'preserves explicit Anthropic-compatible model %s and protocol defaults',
      async (id) => {
        const fixture = await transport('anthropic');
        const model = resolveModel({
          provider: 'anthropic',
          id,
          baseURL: `${origin}/anthropic`,
          apiKey: 'test-key',
        });
        expect(model.baseURL).toBe(`${origin}/anthropic`);
        const client = getLLMClient(
          { ...model, baseURL: `${fixture.baseURL}/anthropic` },
          { type: 'disabled' },
        );
        await client.chat.completions.create({ model: model.id, messages, max_tokens: 4096 });
        expect(fixture.requests).toHaveLength(1);
        expect(fixture.requests[0]).toMatchObject({
          path: '/anthropic/v1/messages',
          body: { model: id, max_tokens: 4096 },
        });
        expect(fixture.requests[0].body).not.toHaveProperty('thinking');
        expect(fixture.requests[0].body).not.toHaveProperty('output_config');
        expect(fixture.requests[0].body).not.toHaveProperty('service_tier');
      },
    );
  });

  it.each(['openai', 'anthropic'] as const)('streams through the %s SDK', async (protocol) => {
    const fixture = await transport(protocol);
    const id = protocol === 'openai' ? flash : 'MiniMax-M3';
    const model = resolveModel({
      provider: protocol === 'openai' ? 'minimax' : 'anthropic',
      id,
      baseURL: `${fixture.baseURL}/${protocol === 'openai' ? 'v1' : 'anthropic'}`,
      apiKey: 'test-key',
    });
    const client = getLLMClient(model, { type: 'enabled' });
    const stream = await client.chat.completions.create({
      model: model.id,
      messages,
      stream: true,
    });
    let text = '';
    let reasoning = '';
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta.content ?? '';
      reasoning +=
        (chunk.choices[0]?.delta as { reasoning_content?: string })?.reasoning_content ?? '';
    }
    expect(text).toBe('ok');
    if (protocol === 'openai') expect(reasoning).toBe('Thinking');
    expect(fixture.requests[0].body).toMatchObject({ model: id, stream: true });
    expect(fixture.requests[0].body).not.toHaveProperty('thinking');
  });

  it.each(['low', 'medium', 'high', 'xhigh', 'max'])(
    'preserves explicit Flash effort %s and adaptive thinking through the agent',
    async (effort) => {
      const fixture = await transport('openai');
      const model = resolveModel({
        provider: 'minimax',
        id: flash,
        apiKey: 'test-key',
        baseURL: `${fixture.baseURL}/custom/v1`,
        params: { reasoning_effort: effort, thinking: { type: 'adaptive' } },
      });
      const client = getLLMClient(model, { type: 'disabled' });
      await client.chat.completions.create({ model: model.id, messages });
      expect(fixture.requests[0]).toMatchObject({
        path: '/custom/v1/chat/completions',
        body: { model: flash, reasoning_effort: effort, thinking: { type: 'adaptive' } },
      });
    },
  );

  it('preserves a runtime model override, custom endpoint, image and tool payloads', async () => {
    const fixture = await transport('openai');
    const model = resolveModel(
      {
        provider: 'minimax',
        id: flash,
        apiKey: 'test-key',
        baseURL: `${fixture.baseURL}/proxy/v1`,
      },
      'custom-saved-model',
    );
    const client = createLLMClient(model);
    const request = {
      model: model.id,
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'Describe this' },
            { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,aGVsbG8=' } },
          ],
        },
      ],
      tools: [
        {
          type: 'function' as const,
          function: { name: 'lookup', parameters: { type: 'object', properties: {} } },
        },
      ],
    };
    await client.chat.completions.create(request);
    expect(fixture.requests[0]).toEqual({ path: '/proxy/v1/chat/completions', body: request });
  });

  it('preserves image and tool content through the Anthropic adapter', async () => {
    const fixture = await transport('anthropic');
    const model = resolveModel({
      provider: 'anthropic',
      id: flash,
      apiKey: 'test-key',
      baseURL: `${fixture.baseURL}/anthropic`,
    });
    const client = createLLMClient(model);
    await client.chat.completions.create({
      model: model.id,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,aGVsbG8=' } },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: { name: 'lookup', parameters: { type: 'object', properties: {} } },
        },
      ],
    });
    expect(fixture.requests[0].body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this' },
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' } },
        ],
      },
    ]);
    expect(fixture.requests[0].body.tools).toMatchObject([
      { name: 'lookup', input_schema: { type: 'object', properties: {} } },
    ]);
  });

  it.each(['openai', 'deepseek'] as const)(
    'preserves %s defaults and reasoning behavior',
    async (provider) => {
      const fixture = await transport('openai');
      const model = resolveModel({
        provider,
        id: '',
        baseURL: `${fixture.baseURL}/v1`,
        apiKey: 'test-key',
      });
      const client = getLLMClient(model, { type: 'disabled' });
      await client.chat.completions.create({ model: model.id, messages });
      expect(fixture.requests[0].body.model).toBe('gpt-4o');
      expect(fixture.requests[0].body.thinking).toEqual(
        provider === 'openai' ? undefined : { type: 'disabled' },
      );
    },
  );
});
