/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MyMCPAgent, getCommonOptions, run, runOptions } from './shared';

export { runOptions };
export const agent = new MyMCPAgent({
  ...getCommonOptions('review__gpt-4o-2024-11-20.md'),
  model: {
    provider: 'azure-openai',
    baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
    id: 'gpt-4o-2024-11-20',
  },
  toolCallEngine: 'native',
  /**
   * OpenAI: https://platform.openai.com/docs/models/gpt-4o
   */
  maxTokens: 16384,
});

async function main() {
  await run(agent);
}

if (require.main === module) {
  main();
}
