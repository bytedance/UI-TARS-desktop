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
  const agent = new Agent();

  const answer = await agent.run({
    model: 'gpt-image-1',
    input: 'Generate a colorful poster with UI-TARS as the theme',
  });

  console.log(answer);
}

main();
