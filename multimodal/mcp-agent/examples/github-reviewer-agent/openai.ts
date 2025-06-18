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
    provider: 'azure-openai',
    baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
    id: 'gpt-4o-2024-11-20',
  },
});

async function main() {
  await run(agent);
}

if (require.main === module) {
  main();
}
