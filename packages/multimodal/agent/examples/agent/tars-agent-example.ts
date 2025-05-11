/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { join } from 'path';
import { TARSAgent } from '../../src/tars-agent';
import { TEST_MODEL_PROVIDERS } from './config';

async function main() {
  // Set working directory to the current examples directory
  const workingDirectory = join(__dirname, './');

  const agent = new TARSAgent({
    model: {
      providers: TEST_MODEL_PROVIDERS,
      defaults: {
        provider: 'azure-openai',
        model: 'aws_sdk_claude37_sonnet',
      },
    },
    tollCallEngine: 'PROMPT_ENGINEERING',
    workingDirectory,
  });

  try {
    await agent.initialize();
    const tools = agent.getTools();
    console.log(`\nAvailable tools (${tools.length}):`);
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }

    // Example queries to test TARSAgent
    const queries = ["Technical analysis of Tesla's future stock price trends"];

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
