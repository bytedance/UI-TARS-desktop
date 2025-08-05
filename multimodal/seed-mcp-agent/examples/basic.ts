/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import SeedMcpAgent from '../src/index';
import { LogLevel } from '@tarko/agent';
import { Questions } from './question';

async function main() {
  const agent = new SeedMcpAgent({
    // model: {
    //   baseURL: process.env.ARK_TEST_URL,
    //   apiKey: process.env.ARK_TEST_KEY,
    //   id: 'ep-20250627155918-4jmhg',
    // },
    model: {
      provider: 'openai-non-streaming',
      baseURL: process.env.SEED_PROXY_URL,
      apiKey: process.env.ARK_TEST_KEY,
      id: '{search.nlp.seed_vision}.{hl}.{M8-23B-MoE-250717_m8_agentrlmodel_codeformatv2_0711_google_roll_back-S100}.{gui_23b_rl_s100}',
    },
    tavilyApiKey: process.env.TAVILY_API_KEY!,
    googleApiKey: process.env.GOOGLE_API_KEY!,
    logLevel: LogLevel.INFO,
  });

  const ans = await agent.run(Questions.Weather);

  console.log('ans: ', ans);
}

main();
