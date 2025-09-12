/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple example: How to abort a streaming Agent task
 * Demonstrates how streams gracefully terminate when aborted
 */

import { Agent, AgentRunStreamingOptions, AgentStatus, LogLevel, Tool, z } from '../../src';

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
        console.log(`Delay for ${seconds} seconds completed`);
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
  const agent = new Agent({
    tools: [delayTool],
    logLevel: LogLevel.INFO,
    instructions:
      'You are an assistant who can use the delay tool to demonstrate time-consuming operations.',
  });

  const runOptions: AgentRunStreamingOptions = {
    input: 'Please perform a task that takes 10 seconds to complete, then write a short poem',
    stream: true,
  };

  console.log('Starting streaming task...');
  const stream = await agent.run(runOptions);

  let eventCount = 0;

  const abortAfterEvents = 5;

  console.log('Receiving stream events:');
  try {
    for await (const event of stream) {
      eventCount++;
      console.log(`Event ${eventCount}:`, JSON.stringify(event));

      if (eventCount >= abortAfterEvents) {
        console.log(`\nReceived ${eventCount} events, aborting execution...`);
        agent.abort();
        console.log(`Agent status after abort: ${agent.status()}`);
      }
    }
    console.log('Stream completed normally');
  } catch (error) {
    console.error('Stream error:', error);
  }

  console.log(`Final Agent status: ${agent.status()}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('\nVerifying Agent is still usable after abortion...');
  try {
    const answer = await agent.run('Hello, what is your name?');
    console.log('Agent response:', answer);
    console.log(`Agent status: ${agent.status()}`);
  } catch (error) {
    console.error('Failed to use Agent again:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
