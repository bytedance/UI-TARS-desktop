/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Agent } from '../src/agent/service';
import { AzureBedrockChat } from './azureBedrockChat';

async function main() {
  const agent = new Agent(
    new AzureBedrockChat({
      azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      model: process.env.AZURE_OPENAI_MODEL,
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_MODEL,
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      temperature: 0.1,
    }),
    {
      registerNewStepCallback: async (event) => {
        console.log('new step', event);
      },
    },
  );

  await agent.run(
    'Open https://news.ycombinator.com/ then find the latest post.',
  );
}

main();
