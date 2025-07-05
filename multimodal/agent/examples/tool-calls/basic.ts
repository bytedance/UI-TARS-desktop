/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic tool call, using `zod` to describe the
 * tool parameters, defaults to OpenAI provider.
 */

import { AgentEventStream } from '@multimodal/agent-interface';
import { Agent, LogLevel, Tool, z } from '../../src';

const locationTool = new Tool({
  id: 'getCurrentLocation',
  description: "Get user's current location",
  parameters: z.object({}),
  function: async () => {
    return { location: 'Boston' };
  },
});

const weatherTool = new Tool({
  id: 'getWeather',
  description: 'Get weather information for a specified location',
  parameters: z.object({
    location: z.string().describe('Location name, such as city name'),
  }),
  function: async (input) => {
    const { location } = input;
    return {
      location,
      temperature: '70°F (21°C)',
      condition: 'Sunny',
      precipitation: '10%',
      humidity: '45%',
      wind: '5 mph',
    };
  },
});

export const agent = new Agent({
  model: {
    provider: 'volcengine',
    // id: 'ep-20250510145437-5sxhs', // 'doubao-1.5-thinking-vision-pro',
    id: 'ep-20250613182556-7z8pl', // 'doubao-1.6',
    apiKey: process.env.ARK_API_KEY,
    useResponseApi: true,
  },
  thinking: {
    type: 'disabled',
  },
  tools: [locationTool, weatherTool],
  logLevel: LogLevel.DEBUG,
});

async function main() {
  const stream = true;

  const answer = await agent.run({
    input: "How's the weather today?",
    stream,
  });
  if (stream) {
    for await (const chunk of answer as unknown as AsyncIterable<AgentEventStream.Event>) {
      'content' in chunk && console.log('answer chunk: ', chunk.content);
    }
  } else {
    console.log('answer resp: ', answer);
  }
}

if (require.main === module) {
  main();
}
