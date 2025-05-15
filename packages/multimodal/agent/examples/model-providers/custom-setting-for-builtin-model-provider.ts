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
        provider: 'openai',
        baseURL: process.env.MY_OPENAI_BASE_URL,
        model: 'gpt-4o-2024-11-20',
      },
    },
  });

  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
