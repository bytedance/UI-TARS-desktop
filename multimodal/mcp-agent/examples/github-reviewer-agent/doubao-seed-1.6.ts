/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MyMCPAgent, getCommonOptions, run, runOptions } from './shared';

export { runOptions };

export const agent = new MyMCPAgent({
  ...getCommonOptions('review__doubao-seed-1.6.md'),
  model: {
    provider: 'volcengine',
    apiKey: process.env.ARK_API_KEY,
    id: 'ep-20250613182556-7z8pl', // 'doubao-seed-1.6',
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
