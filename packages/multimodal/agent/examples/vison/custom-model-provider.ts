/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic vision understanding.
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      providers: [
        {
          name: 'openai',
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          apiKey: process.env.ARK_API_KEY,
          models: ['doubao-1-5-thinking-vision-pro-250428'],
        },
      ],
    },
  });

  const answer = await agent.run({
    input: [
      {
        type: 'text',
        text: 'What do you see in this image?',
      },
      {
        type: 'image_url',
        // If you set a image url that cannot access in CN network, you would get following error:
        // LLM API error: Error: 400 Timeout while downloading url: https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png Request id: 021747249259246c3357216e17c0b80f370e26caa2c4bb88e9eff
        image_url: {
          url: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/psvhouloj/agent-tars/simple-image.png',
          detail: 'low',
        },
      },
    ],
  });

  console.log(answer);
}

main();
