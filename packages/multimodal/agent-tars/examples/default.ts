/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'path';
import { AgentTARS, AgentTARSOptions } from '../src';
import { TEST_MODEL_PROVIDERS } from '@multimodal/agent/_config';

export const DEFUALT_OPTIONS: AgentTARSOptions = {
  workspace: {
    workingDirectory: join(__dirname, './workspace'),
  },
  model: {
    providers: TEST_MODEL_PROVIDERS,
    defaults: {
      provider: 'azure-openai',
      model: 'aws_sdk_claude37_sonnet',
    },
  },
  tollCallEngine: 'PROMPT_ENGINEERING',
  // Set working directory to the current examples directory
  maxIterations: 100,
  temperature: 0,
  thinking: {
    type: 'disabled',
  },
  // search: {
  //   provider: 'bing_search',
  // },
  experimental: {
    dumpMessageHistory: true,
  },
};

export async function runAgentTARS(query: string) {
  const agent = new AgentTARS(DEFUALT_OPTIONS);

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
