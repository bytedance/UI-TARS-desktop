/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use model provider "azure-openai".
 */

import { Agent } from '../../src';

async function main() {
  const agent = new Agent({
    model: {
      use: {
        provider: 'azure-openai',
        baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
        model: 'aws_sdk_claude37_sonnet',
      },
    },
  });
  const answer = await agent.run('Hello, what is your name?');
  console.log(answer);
}

main();
