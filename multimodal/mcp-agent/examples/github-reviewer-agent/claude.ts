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
    id: 'aws_sdk_claude37_sonnet',
  },
});

async function main() {
  await run(agent);
}

if (require.main === module) {
  main();
}
