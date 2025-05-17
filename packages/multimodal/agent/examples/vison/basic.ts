/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic vision understanding.
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent();

  const answer = await agent.run({
    input: [
      {
        type: 'text',
        text: 'What do you see in this image?',
      },
      {
        type: 'image_url',
        image_url: {
          url: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/simple-image.png',
          detail: 'low',
        },
      },
    ],
  });

  console.log(answer);
}

main();
