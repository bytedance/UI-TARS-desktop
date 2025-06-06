/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple example: How to abort a running Agent task
 */

import { Agent, AgentStatus, EventType, LogLevel, Tool, z } from '../../src';

// Create a tool that simulates a time-consuming operation
const delayTool = new Tool({
  id: 'delay',
  description: 'Perform a delay operation for a specified duration',
  parameters: z.object({
    seconds: z.number().describe('Number of seconds to delay'),
  }),
  function: async (input) => {
    const { seconds } = input;
    console.log(`Starting delay for ${seconds} seconds...`);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`Delay for ${seconds} seconds completed normally`);
        resolve({ message: 'Delay completed', seconds });
      }, seconds * 1000);

      // Return a cleanup function to cancel the timer when aborted
      return () => {
        clearTimeout(timeout);
        console.log(`Delay for ${seconds} seconds was cancelled`);
      };
    });
  },
});

async function main() {
  // Create Agent instance
  const agent = new Agent({
    tools: [delayTool],
    logLevel: LogLevel.INFO,
    instructions:
      'You are an assistant who can use the delay tool to demonstrate time-consuming operations. When asked to perform a time-consuming task, please use the delay tool.',
  });

  // Listen to system events
  agent.getEventStream().subscribe((event) => {
    if (event.type === EventType.SYSTEM) {
      console.log(`[System Event] ${event.message}`);
    }
  });

  console.log('Starting a time-consuming task...');
  console.log(`Current Agent status: ${agent.status()}`);

  // Start a time-consuming task but don't wait for it to complete immediately
  const resultPromise = agent.run('Please perform a task that takes 10 seconds to complete');

  console.log(`Agent status after starting task: ${agent.status()}`);

  // Wait 2 seconds before aborting
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (agent.status() === AgentStatus.EXECUTING) {
    console.log('Aborting execution after 2 seconds...');
    const abortResult = agent.abort();
    console.log(`Abort result: ${abortResult}`);
    console.log(`Agent status after abort: ${agent.status()}`);
  }

  // Try to get the result
  try {
    const result = await resultPromise;
    console.log('Task completion result:', result);
  } catch (error) {
    console.error('Task failed:', error);
  }

  console.log(`Final Agent status: ${agent.status()}`);

  // Demonstrate that Agent can still be used after abortion
  console.log('\nDemonstrating Agent is still usable after abortion...');
  try {
    const answer = await agent.run('Hello, what time is it now?');
    console.log('New task completion result:', answer);
  } catch (error) {
    console.error('New task failed:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
