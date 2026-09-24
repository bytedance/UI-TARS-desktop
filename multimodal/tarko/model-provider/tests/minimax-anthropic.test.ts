/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createLLMClient } from '../src/llm-client';
import { resolveModel } from '../src/model-resolver';

describe('MiniMax Anthropic-compatible endpoints', () => {
  it.each(['global', 'cn'])(
    'appends /v1/messages exactly once for the %s SDK base URL',
    async (region) => {
      const requestPaths: string[] = [];
      const server = createServer((request, response) => {
        requestPaths.push(request.url ?? '');
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            id: 'msg_test',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: 'ok' }],
            model: 'MiniMax-M3',
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
        );
      });

      await new Promise<void>((resolve, reject) => {
        server.listen(0, '127.0.0.1', resolve);
        server.once('error', reject);
      });

      try {
        const { port } = server.address() as AddressInfo;
        const baseURL = `http://127.0.0.1:${port}/${region}/anthropic`;
        const model = resolveModel({
          provider: 'anthropic',
          id: 'MiniMax-M3',
          apiKey: 'minimax-key',
          baseURL,
        });
        const client = createLLMClient(model);

        await client.chat.completions.create({
          model: model.id,
          messages: [{ role: 'user', content: 'Hello' }],
        });

        expect(requestPaths).toEqual([`/${region}/anthropic/v1/messages`]);
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  );
});
