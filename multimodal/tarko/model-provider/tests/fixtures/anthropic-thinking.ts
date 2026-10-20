/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AnthropicContentBlock } from '../../src/types';

export const thinkingToolBlocks: AnthropicContentBlock[] = [
  { type: 'thinking', thinking: 'First reason', signature: 'signed-first' },
  { type: 'redacted_thinking', data: 'opaque-redacted-data' },
  { type: 'text', text: 'Checking.' },
  { type: 'tool_use', id: 'tool_one', name: 'lookup', input: { query: 'one' } },
  { type: 'thinking', thinking: 'Next reason', signature: 'signed-next' },
  { type: 'text', text: 'Again.' },
  { type: 'tool_use', id: 'tool_two', name: 'lookup', input: { query: 'two' } },
];
export const finalBlocks: AnthropicContentBlock[] = [
  { type: 'thinking', thinking: 'Finished reasoning', signature: 'signed-final' },
  { type: 'text', text: 'Done.' },
];

function fragments(value: string) {
  const middle = Math.floor(value.length / 2);
  return [value.slice(0, middle), value.slice(middle)];
}

// Real HTTP/SSE fixture: only the server response is simulated, not the SDK or agent.
export async function anthropicFixture(responses: AnthropicContentBlock[][]) {
  const requests: Array<{ path: string; body: any }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const content = responses[requests.length];
    requests.push({ path: request.url ?? '', body });
    if (!content) {
      response.writeHead(400);
      response.end(
        JSON.stringify({
          error: { type: 'invalid_request_error', message: 'Unexpected fixture request' },
        }),
      );
      return;
    }
    const stop_reason = content.some((block) => block.type === 'tool_use')
      ? 'tool_use'
      : 'end_turn';
    const message = {
      id: `msg_${requests.length}`,
      type: 'message',
      role: 'assistant',
      model: body.model,
      content,
      stop_reason,
      stop_sequence: null,
      usage: { input_tokens: 7, output_tokens: 11 },
    };
    if (!body.stream) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(message));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const send = (event: any) =>
      response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    send({
      type: 'message_start',
      message: {
        ...message,
        content: [],
        stop_reason: null,
        usage: { input_tokens: 7, output_tokens: 0 },
      },
    });
    content.forEach((block, index) => {
      const start =
        block.type === 'thinking'
          ? { type: 'thinking', thinking: '', signature: '' }
          : block.type === 'text'
            ? { type: 'text', text: '' }
            : block.type === 'tool_use'
              ? { ...block, input: {} }
              : block;
      send({ type: 'content_block_start', index, content_block: start });
      const delta = (change: object) => send({ type: 'content_block_delta', index, delta: change });
      if (block.type === 'thinking') {
        for (const part of fragments(block.thinking))
          delta({ type: 'thinking_delta', thinking: part });
        for (const part of fragments(block.signature ?? ''))
          delta({ type: 'signature_delta', signature: part });
      } else if (block.type === 'text') {
        for (const part of fragments(block.text)) delta({ type: 'text_delta', text: part });
      } else if (block.type === 'tool_use') {
        for (const part of fragments(JSON.stringify(block.input)))
          delta({ type: 'input_json_delta', partial_json: part });
      }
      send({ type: 'content_block_stop', index });
    });
    send({
      type: 'message_delta',
      delta: { stop_reason, stop_sequence: null },
      usage: { output_tokens: 11 },
    });
    send({ type: 'message_stop' });
    response.end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/anthropic`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
