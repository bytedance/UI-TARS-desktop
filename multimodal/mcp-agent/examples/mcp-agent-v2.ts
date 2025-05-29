/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MCPAgent } from '../src';
import { TEST_MODEL_PROVIDERS } from '@multimodal/agent/_config';

async function main() {
  const agent = new MCPAgent({
    instructions:
      'You are Agent TARS, a helpful assistant that can use the tools available to help users with their questions.',
    mcpClientVersion: 'v2',
    mcpServers: {
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
    },
    model: {
      providers: TEST_MODEL_PROVIDERS,
      use: {
        provider: 'azure-openai',
        model: 'aws_sdk_claude37_sonnet',
      },
    },
    toolCallEngine: 'prompt_engineering',
  });

  try {
    await agent.initialize();
    const tools = agent.getTools();
    console.log(`\nAvailable tools (${tools.length}):`);
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }

    const queries = ['Can you find information about the UI-TARS-Desktop'];

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
    console.error('Error:', error);
  } finally {
    await agent.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
