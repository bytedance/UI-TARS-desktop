/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An example of a basic vision understanding.
 *
 * Error: The server had an error while processing your request. Sorry about that!
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      provider: 'openai',
      id: 'gpt-image-1',
    },
  });

  const answer = await agent.run({
    input: 'Generate a colorful poster with UI-TARS as the theme',
  });

  console.log(answer);
}

main();
