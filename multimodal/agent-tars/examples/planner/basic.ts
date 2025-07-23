/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARS, AgentRunStreamingOptions } from '../../src';

export const agent = new AgentTARS({
  model: {
    provider: 'volcengine',
    id: 'ep-20250510145437-5sxhs',
    apiKey: process.env.ARK_API_KEY,
  },
  planner: {
    enable: true,
  },
  toolCallEngine: 'prompt_engineering',
});

export const runOptions: AgentRunStreamingOptions = {
  input: 'Research web infra open-source and generate a report',
  stream: true,
};

async function main() {
  const response = await agent.run(runOptions);
  for await (const chunk of response) {
    console.log(chunk);
  }
}

if (require.main === module) {
  main();
}
