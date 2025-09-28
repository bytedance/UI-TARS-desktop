/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use models from "volcengine".
 *
 * @default baseUrl https://ark.cn-beijing.volces.com/api/v3
 * @default apiKey https://ark.cn-beijing.volces.com/api/v3
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      provider: 'volcengine',
      id: 'doubao-seed-1-6-vision-250815',
      apiKey: process.env.ARK_API_KEY,
    },
  });
  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
