/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use models from "ollama".
 *
 * Note: Ollama does not support hidden reasoning tokens.
 * @see https://github.com/ollama/ollama/issues/8875
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        provider: 'ollama',
        model: 'deepseek-r1:14b',
      },
    },
  });
  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
