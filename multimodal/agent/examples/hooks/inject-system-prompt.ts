/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple example: How to modify system prompt dynamically using onPrepareRequest hook
 */

import { PrepareRequestContext, PrepareRequestResult, Agent } from '../../src';

class CustomAgent extends Agent {
  public onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
    const { systemPrompt, tools, iteration } = context;

    const enhancedPrompt = `IMPORTANT: You are in iteration ${iteration}.
${systemPrompt}
User name: ULIVZ.`;

    return {
      systemPrompt: enhancedPrompt,
      tools,
    };
  }
}

async function main() {
  const agent = new CustomAgent();
  const response = await agent.run('Current iteration and user name.');
  console.log('Response:', response);
}

if (require.main === module) {
  main().catch(console.error);
}
