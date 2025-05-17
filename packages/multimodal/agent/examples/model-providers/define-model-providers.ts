/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An minimal example, using built-in model provider.
 * and specify a model to use.
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        model: 'ep-20250205140236', // DeepSeek R1
      },
      providers: [
        {
          name: 'deepseek',
          baseURL: 'https://ark-cn-beijing.bytedance.net/api/v3',
          apiKey: process.env.ARK_DEEPSEEK_API_KEY,
          models: [
            'ep-20250205140052', // DeepSeek R1
            'ep-20250205140236', // DeepSeek V3
          ],
        },
      ],
    },
  });

  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
