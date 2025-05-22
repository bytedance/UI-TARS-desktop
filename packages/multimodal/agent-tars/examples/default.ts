/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'path';
import { AgentTARS, AgentTARSOptions, LogLevel } from '../src';
import { TEST_MODEL_PROVIDERS } from '@multimodal/agent/_config';

export const DEFUALT_OPTIONS: AgentTARSOptions = {
  workspace: {
    workingDirectory: join(__dirname, './workspace'),
  },
  model: {
    providers: TEST_MODEL_PROVIDERS,
    // use: {
    //   provider: 'azure-openai',
    //   model: 'aws_sdk_claude37_sonnet',
    // },
    use: {
      provider: 'volcengine',
      model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
      apiKey: process.env.ARK_API_KEY,
    },
  },
  toolCallEngine: 'prompt_engineering',
  maxIterations: 100,
  // temperature: 0,
  thinking: {
    type: 'disabled',
  },
  search: {
    provider: 'browser_search',
  },
  experimental: {
    dumpMessageHistory: true,
  },
  logLevel: LogLevel.DEBUG,
};

export const agent = new AgentTARS(DEFUALT_OPTIONS);

export async function runAgentTARS(query: string) {
  try {
    await agent.initialize();
    console.log('\n==================================================');
    console.log(`👤 User query: ${query}`);
    console.log('==================================================');

    const answer = await agent.run(query);

    console.log('--------------------------------------------------');
    console.log(`🤖 Assistant response: ${answer}`);
    console.log('==================================================\n');
  } catch (error) {
    console.error('Error during agent execution:', error);
  } finally {
    await agent.cleanup();
  }
}
