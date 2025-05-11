/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { join } from 'path';
import { TARSAgent } from '../src';
import { TEST_MODEL_PROVIDERS } from '@multimodal/agent/_config';

async function main() {
  const agent = new TARSAgent({
    model: {
      providers: TEST_MODEL_PROVIDERS,
      defaults: {
        provider: 'azure-openai',
        model: 'aws_sdk_claude37_sonnet',
      },
    },
    tollCallEngine: 'PROMPT_ENGINEERING',
    // Set working directory to the current examples directory
    workingDirectory: join(__dirname, './workspace'),
    maxIterations: 100,
    temperature: 0,
    thinking: {
      type: 'disabled',
    },
  });

  try {
    await agent.initialize();

    const queries = ["Technical analysis of Tesla's future stock price trends"];
    // const queries = ["Create a text file called 'hello.txt' with content 'Hello TARSAgent!'"];

    for (const query of queries) {
      console.log('\n==================================================');
      console.log(`👤 User query: ${query}`);
      console.log('==================================================');

      const answer = await agent.run(query);

      console.log('--------------------------------------------------');
      console.log(`🤖 Assistant response: ${answer}`);
      console.log('==================================================\n');
    }
  } catch (error) {
    console.error('Error during agent execution:', error);
  } finally {
    await agent.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
