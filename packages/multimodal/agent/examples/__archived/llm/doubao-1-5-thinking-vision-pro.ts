/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable no-unsafe-optional-chaining */
import { OpenAI } from 'openai';
import { TokenJS } from '@multimodal/llm-client';

export const tokenjs = new TokenJS({
  apiKey: process.env.ARK_API_KEY,
  baseURL: process.env.MM_TEST_BASE_URL,
});

tokenjs.extendModelList('openai', 'ep-20250510145437-5sxhs', {
  streaming: true,
  json: true,
  toolCalls: true,
  images: true,
});

// FIXME: remove as, we need to fix the type issue of token.js
const client = tokenjs as unknown as OpenAI;

async function main() {
  console.time('> TTFT');

  // @ts-expect-error
  const completion = await client.chat.completions.create({
    provider: 'openai',
    stream: true as const,
    model: process.env.MM_TEST_MODEL!,
    messages: [
      {
        role: 'user',
        content: 'Hello!',
      },
    ],
  });

  console.timeEnd('> TTFT');

  console.time('> Streaming Duration');

  let reachReasoning = false;
  let reachContent = false;
  for await (const part of completion) {
    // @ts-expect-error
    const { content, reasoning_content } = part.choices[0]?.delta!;
    if (reasoning_content) {
      if (!reachReasoning) {
        reachReasoning = true;
        console.log('> Reasoning Content:');
      }
      process.stdout.write(reasoning_content);
    }
    if (content) {
      if (!reachContent) {
        reachContent = true;
        console.log('\n> Content:');
      }
      process.stdout.write(content);
    }
  }

  console.log('');
  console.timeEnd('> Streaming Duration');
}

main();
