/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An minimal example, no model providers configured,
 * defaults to "openai" provider and "gpt-4o" model.
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        provider: 'openai',
        model: 'gpt-4o',
      },
    },
  });
  const answer = await agent.run('Hello!');
  console.log(answer);
}

main();
