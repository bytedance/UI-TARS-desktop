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
  console.log(process.env.MM_TEST_MODEL!);

  const completion = await client.chat.completions.create({
    // @ts-expect-error
    provider: 'openai',
    model: process.env.MM_TEST_MODEL!,
    messages: [
      {
        role: 'system',
        content:
          '\n  You are a tool call agent, you MUST SELECT a TOOL to handle user\'s request.\n  \n  1. DO NOT make any fake informations\n  2. "finish_reason" should always be "tool_calls"\n  \n\nCurrent time: 5/11/2025, 3:41:25 PM',
      },
      {
        role: 'user',
        content: "How's the weather today?",
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'getCurrentLocation',
          description: "Get user's current location",
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getWeather',
          description: 'Get weather information for a specified location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Location name, such as city name',
              },
            },
            required: ['location'],
          },
        },
      },
    ],
    temperature: 0.7,
  });

  console.timeEnd('> TTFT');

  console.time('> Request Duration');

  console.log(JSON.stringify(completion));

  console.log('');
  console.timeEnd('> Request Duration');
}

main();
