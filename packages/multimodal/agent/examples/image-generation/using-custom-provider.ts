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
          name: 'azure-openai',
          baseURL: process.env.OPENAI_API_BASE_URL,
          models: [],
        },
      ],
    },
  });

  const answer = await agent.run({
    provider: 'azure-openai',
    model: 'gpt-image-1',
    input: 'Generate a colorful poster with UI-TARS as the theme',
  });

  console.log(answer);
}

main();
