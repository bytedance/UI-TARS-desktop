/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MyMCPAgent, getCommonOptions, run, runOptions } from './shared';

export { runOptions };
export const agent = new MyMCPAgent({
  ...getCommonOptions('review__aws_sdk_claude37_sonnet.md'),
  model: {
    provider: 'azure-openai',
    baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
    id: 'aws_sdk_claude37_sonnet',
  },
  toolCallEngine: 'native',
  maxTokens: 16384,
});

async function main() {
  await run(agent);
}

if (require.main === module) {
  main();
}
