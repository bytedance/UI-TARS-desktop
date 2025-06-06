/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple example: How Agent prevents concurrent execution
 * Demonstrates that attempting to run a second task while one is executing will result in an error
 */

import { Agent, LogLevel, Tool, z } from '../../src';

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
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    console.log(`Delay for ${seconds} seconds completed`);
    return { completed: true, seconds };
  },
});

async function main() {
  const agent = new Agent({
    tools: [delayTool],
    logLevel: LogLevel.INFO,
    instructions:
      'You are an assistant who can use the delay tool to demonstrate time-consuming operations.',
  });

  // Start the first task (5 seconds)
  console.log('Starting first task (5 seconds)...');
  const firstTaskPromise = agent.run('Please perform a task that takes 5 seconds to complete');

  // Wait a moment to ensure the first task has started
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Try to start a second task (should fail because the first task is still running)
  console.log('Trying to start a second task while the first task is running...');
  try {
    const secondTaskResult = await agent.run('Please perform another task');
    console.log('Second task completed (this should not happen):', secondTaskResult);
  } catch (error) {
    console.error('Second task failed as expected:', error.message);
  }

  // Wait for the first task to complete
  try {
    const firstTaskResult = await firstTaskPromise;
    console.log('First task completed:', firstTaskResult);
  } catch (error) {
    console.error('First task failed:', error.message);
  }

  // After the first task completes, the third task should execute normally
  console.log('\nStarting third task after first task completion...');
  try {
    const thirdTaskResult = await agent.run('Please perform a quick task');
    console.log('Third task completed successfully:', thirdTaskResult);
  } catch (error) {
    console.error('Third task failed (unexpected):', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
