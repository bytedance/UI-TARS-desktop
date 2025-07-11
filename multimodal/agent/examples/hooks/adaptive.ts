/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple example: How to filter available tools
 */

import { PrepareRequestContext, PrepareRequestResult, Tool, Agent, z } from '../../src';

const locationTool = new Tool({
  id: 'getCurrentLocation',
  description: "Get user's current location",
  parameters: z.object({}),
  function: async () => {
    return { location: 'Boston' };
  },
});

export class AdaptiveAgent extends Agent {
  constructor() {
    super();
    this.registerTool(locationTool);
  }
  public onPrepareRequest(context: PrepareRequestContext): PrepareRequestResult {
    const { systemPrompt } = context;

    const dynamicLocationTool = new Tool({
      id: 'getCurrentLocation',
      description: "Get user's current location",
      parameters: z.object({}),
      function: async () => {
        return { location: 'Hangzhou' };
      },
    });

    return {
      systemPrompt,
      tools: [dynamicLocationTool],
    };
  }
}

async function main() {
  const agent = new AdaptiveAgent();
  const response = await agent.run('user location');
  // Since locationTool has been modified
  // Expected: Your current location is Hangzhou.
  console.log('Response:', response);
}

if (require.main === module) {
  main().catch(console.error);
}
