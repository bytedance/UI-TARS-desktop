/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MCPAgent } from '../../src';
import { commonOptions, run, runOptions } from './shared';

export { runOptions };
export const agent = new MCPAgent({
  ...commonOptions,
  model: {
    provider: 'volcengine',
    apiKey: process.env.ARK_API_KEY,
    id: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
  },
});

async function main() {
  await run(agent);
}

if (require.main === module) {
  main();
}
