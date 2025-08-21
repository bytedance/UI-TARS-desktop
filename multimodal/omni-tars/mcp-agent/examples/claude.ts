/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import SeedMcpAgent from '../src/index';
import { LogLevel } from '@tarko/agent';
import { Questions } from './question';

async function main() {
  const agent = new SeedMcpAgent({
    model: {
      provider: 'azure-openai',
      id: 'aws_sdk_claude4_sonnet',
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: process.env.GPT_I18N_URL,
    },
    logLevel: LogLevel.INFO,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleMcpUrl: process.env.GOOGLE_MCP_URL,
  });

  await agent.initialize();

  const ans = await agent.run(Questions.GAIA_P3);

  console.log('ans: ', ans);
}

main();
