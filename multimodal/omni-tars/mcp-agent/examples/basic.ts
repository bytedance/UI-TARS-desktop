/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import MCPAgent from '../src/index';
import { LogLevel } from '@tarko/agent';
import { Questions } from './question';

async function main() {
  const agent = new MCPAgent({
    model: {
      provider: 'openai-non-streaming',
      baseURL: process.env.OMNI_TARS_BASE_URL,
      apiKey: process.env.OMNI_TARS_API_KEY,
      id: process.env.OMNI_TARS_MODEL_ID,
    },
    logLevel: LogLevel.INFO,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleMcpUrl: process.env.GOOGLE_MCP_URL,
  });

  const ans = await agent.run(Questions.Weather);

  console.log('ans: ', ans);
}

main();
