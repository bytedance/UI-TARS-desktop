/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use models from "MiniMax".
 *
 * @default baseUrl https://api.minimax.io/v1
 *
 * Available models:
 * - MiniMax-M2.7 (latest flagship model with enhanced reasoning and coding)
 * - MiniMax-M2.7-highspeed (high-speed version of M2.7 for low-latency scenarios)
 * - MiniMax-M2.5 (204K context window)
 * - MiniMax-M2.5-highspeed (204K context window, optimized for speed)
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      provider: 'minimax',
      apiKey: process.env.MINIMAX_API_KEY,
      id: 'MiniMax-M2.7',
    },
  });
  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
