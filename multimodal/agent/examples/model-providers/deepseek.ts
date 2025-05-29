/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use models from "deepseek".
 *
 * @default baseUrl https://ark.cn-beijing.volces.com/api/v3
 * @default apiKey https://ark.cn-beijing.volces.com/api/v3
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        provider: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY,
        // model: 'deepseek-chat', // v3
        model: 'deepseek-reasoner', // R1
      },
    },
  });
  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
