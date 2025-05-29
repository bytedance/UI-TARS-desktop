/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Specify model in agent run.
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        provider: 'openai',
      },
    },
  });

  const answer1 = await agent.run({
    model: 'gpt-4o',
    input: 'who are you',
  });

  const answer2 = await agent.run({
    model: 'gpt-4.5-preview',
    input: 'who are you',
  });

  console.log('answer1', answer1);
  console.log('answer2', answer2);
}

main();
