/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An minimal example to using built-in model provider
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        provider: 'openai',
        model: 'gpt-4.5-preview',
      },
    },
  });
  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
