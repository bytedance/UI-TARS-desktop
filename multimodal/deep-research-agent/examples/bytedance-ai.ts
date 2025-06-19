/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel } from '@multimodal/agent';
import { AgentEventStream PlanStep } from '@multimodal/agent';
import { DeepResearchAgent } from '../src/agent/deep-research-agent';

// Configure the agent with API key from environment
const agent = new DeepResearchAgent({
  name: 'DeepResearchAgent',
  logLevel: LogLevel.DEBUG,
  model: {
    provider: 'volcengine',
    id: 'ep-20250510145437-5sxhs', // 'doubao-1.5-thinking-vision-pro',
    apiKey: process.env.ARK_API_KEY,
  },
  maxIterations: 100,
  toolCallEngine: 'structured_outputs',
});

// Example query to test the agent
const runOptions = {
  input: `帮我调研一下 ByteDance 大模型的发展情况，给出一份完整的报告

我期待覆盖的信息： 

1. Seed 大模型现状；
2. 大模型应用场景；
3. 开源项目；
4. 行业影响力；
5. 未来发展；

要求报告输出中文。`,
};

// Main function for running the example
async function main() {
  // Check for command line arguments
  const userQuery = process.argv[2] || runOptions.input;

  await agent.initialize();

  console.log('\n🤖 Running Deep Research Agent');
  console.log('--------------------------------------------');
  console.log(`Query: "${userQuery}"`);
  console.log('--------------------------------------------');

  // Subscribe to plan events
  const unsubscribe = agent
    .getEventStream()
    .subscribeToTypes(
      ['plan_start', 'plan_update', 'plan_finish'],
      (event: AgentEventStream.Event) => {
        if (event.type === 'plan_start') {
          console.log('\n📝 Research plan started');
          console.log('--------------------------------------------');
        } else if (event.type === 'plan_update') {
          const planEvent = event as any;
          console.log('\n📋 Research plan updated:');
          console.log('--------------------------------------------');
          planEvent.steps.forEach((step: AgentEventStream.PlanStep, index: number) => {
            console.log(`  ${index + 1}. [${step.done ? '✓' : ' '}] ${step.content}`);
          });
          console.log('--------------------------------------------');
        } else if (event.type === 'plan_finish') {
          const planEvent = event as any;
          console.log('\n🎉 Research plan completed!');
          console.log('--------------------------------------------');
          console.log(`Summary: ${planEvent.summary}`);
          console.log('--------------------------------------------');
        }
      },
    );

  // Also subscribe to tool events for better visibility
  const toolUnsubscribe = agent
    .getEventStream()
    .subscribeToTypes(['tool_call', 'tool_result'], (event: AgentEventStream.Event) => {
      if (event.type === 'tool_call') {
        const toolEvent = event as any;
        console.log(`\n🔧 Using research tool: ${toolEvent.name}`);
      } else if (event.type === 'tool_result') {
        const resultEvent = event as any;

        // Show image extraction information if available
        if (
          resultEvent.name === 'visit-link' &&
          resultEvent.content &&
          typeof resultEvent.content === 'object' &&
          resultEvent.content.images
        ) {
          const imageCount = resultEvent.content.images.length;
          if (imageCount > 0) {
            console.log(`✅ Research result received with ${imageCount} images`);
          } else {
            console.log(`✅ Research result received`);
          }
        } else {
          console.log(`✅ Research result received`);
        }
      }
    });

  // Run the agent with the specified query
  const result = await agent.run({
    ...runOptions,
    input: userQuery,
  });

  console.log('\n🤖 Final research report:');
  console.log('--------------------------------------------');
  console.log(result.content);
  console.log('--------------------------------------------');

  // Clean up subscriptions
  unsubscribe();
  toolUnsubscribe();
}

if (require.main === module) {
  main().catch(console.error);
}
