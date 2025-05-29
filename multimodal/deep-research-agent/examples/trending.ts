/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel } from '@multimodal/agent';
import { Event, EventType, PlanStep } from '@multimodal/agent';
import { DeepResearchAgent } from '../src/agent/deep-research-agent';

// Configure the agent with API key from environment
const agent = new DeepResearchAgent({
  name: 'DeepResearchAgent',
  logLevel: LogLevel.DEBUG,
  model: {
    use: {
      provider: 'volcengine',
      model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
      apiKey: process.env.ARK_API_KEY,
    },
  },
  maxIterations: 100,
  toolCallEngine: 'structured_outputs',
});

// Example query to test the agent
const runOptions = {
  input: `帮我调研一下 ByteDance 今日 trending 项目`,
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
      [EventType.PLAN_START, EventType.PLAN_UPDATE, EventType.PLAN_FINISH],
      (event: Event) => {
        if (event.type === EventType.PLAN_START) {
          console.log('\n📝 Research plan started');
          console.log('--------------------------------------------');
        } else if (event.type === EventType.PLAN_UPDATE) {
          const planEvent = event as any;
          console.log('\n📋 Research plan updated:');
          console.log('--------------------------------------------');
          planEvent.steps.forEach((step: PlanStep, index: number) => {
            console.log(`  ${index + 1}. [${step.done ? '✓' : ' '}] ${step.content}`);
          });
          console.log('--------------------------------------------');
        } else if (event.type === EventType.PLAN_FINISH) {
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
    .subscribeToTypes([EventType.TOOL_CALL, EventType.TOOL_RESULT], (event: Event) => {
      if (event.type === EventType.TOOL_CALL) {
        const toolEvent = event as any;
        console.log(`\n🔧 Using research tool: ${toolEvent.name}`);
      } else if (event.type === EventType.TOOL_RESULT) {
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
