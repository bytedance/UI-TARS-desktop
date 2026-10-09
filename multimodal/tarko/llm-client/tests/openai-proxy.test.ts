/* SPDX-License-Identifier: Apache-2.0 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it } from 'vitest';

import { TokenJS } from '../src/index.js';
import { getOpenAIHttpAgent } from '../src/handlers/openai-proxy.js';

const proxyVariables = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
  'NO_PROXY',
  'no_proxy',
] as const;
const originalEnvironment = Object.fromEntries(
  proxyVariables.map((name) => [name, process.env[name]]),
);

afterEach(() => {
  for (const name of proxyVariables) {
    const value = originalEnvironment[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

it('keeps the OpenAI SDK default agent without a proxy', () => {
  for (const name of proxyVariables) {
    delete process.env[name];
  }
  expect(getOpenAIHttpAgent()).toBeUndefined();
});

it('uses HTTPS_PROXY for OpenAI and honors NO_PROXY', () => {
  for (const name of proxyVariables) {
    delete process.env[name];
  }
  process.env.HTTPS_PROXY = 'http://127.0.0.1:4780';

  const agent = getOpenAIHttpAgent();
  expect(agent?.getProxyForUrl('https://api.openai.com/v1/chat/completions')).toBe(
    'http://127.0.0.1:4780',
  );

  process.env.NO_PROXY = 'api.openai.com';
  expect(agent?.getProxyForUrl('https://api.openai.com/v1/chat/completions')).toBe('');
});

it('routes OpenAI and OpenAI non-streaming requests through HTTP_PROXY', async () => {
  const requestedUrls: string[] = [];
  const proxy = createServer((request, response) => {
    requestedUrls.push(request.url ?? '');
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        id: 'chatcmpl-proxy-test',
        object: 'chat.completion',
        created: 0,
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'through proxy' },
            finish_reason: 'stop',
          },
        ],
      }),
    );
  });

  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  try {
    for (const name of proxyVariables) {
      delete process.env[name];
    }
    const address = proxy.address() as AddressInfo;
    process.env.HTTP_PROXY = `http://127.0.0.1:${address.port}`;

    const client = new TokenJS({
      apiKey: 'test-key',
      baseURL: 'http://unresolvable.invalid/v1',
    });
    const openAIResponse = await client.chat.completions.create({
      provider: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    const nonStreamingResponse = await client.chat.completions.create({
      provider: 'openai-non-streaming',
      model: 'o1-mini',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(openAIResponse.choices[0].message.content).toBe('through proxy');
    expect(nonStreamingResponse.choices[0].message.content).toBe('through proxy');
    expect(requestedUrls).toEqual([
      'http://unresolvable.invalid/v1/chat/completions',
      'http://unresolvable.invalid/v1/chat/completions',
    ]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      proxy.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
