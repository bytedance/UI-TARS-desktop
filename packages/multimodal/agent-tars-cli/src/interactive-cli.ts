/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInterface } from 'readline';
import { AgentTARS, AgentTARSOptions, EventType } from '@agent-tars/core';
import { ensureWorkingDirectory } from '@agent-tars/server';

/**
 * Generates a semantic session ID for CLI interactions
 * Format: cli_YYYYMMDD_HHMMSS_XXXX (where XXXX is a random string)
 */
function generateSessionId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6);

  return `cli_${datePart}_${timePart}_${randomPart}`;
}

/**
 * Start the TARS agent in interactive mode on the command line
 */
export async function startInteractiveCLI(config: AgentTARSOptions = {}): Promise<void> {
  console.log('🤖 Starting TARS Agent in interactive mode...');

  // Create a temporary workspace with semantic session ID
  const sessionId = generateSessionId();
  const workingDirectory = ensureWorkingDirectory(sessionId);

  // Initialize agent with merged config
  const agent = new AgentTARS({
    ...config,
    workspace: {
      ...(config.workspace || {}),
      workingDirectory,
    },
  });

  try {
    // Initialize agent
    await agent.initialize();

    // Connect to event stream
    const eventStream = agent.getEventStream();

    // Subscribe to agent events for CLI output
    const unsubscribe = eventStream.subscribe((event) => {
      switch (event.type) {
        case EventType.TOOL_CALL:
          console.log(`🔧 [Tool] ${event.name}(${JSON.stringify(event.arguments)})`);
          break;
        case EventType.TOOL_RESULT:
          if (event.error) {
            console.error(`❌ [Tool Error] ${event.name}: ${event.error}`);
          } else {
            // Truncate long tool results
            const content =
              typeof event.content === 'string'
                ? event.content.length > 100
                  ? `${event.content.substring(0, 100)}...`
                  : event.content
                : '[Complex Result]';
            console.log(`✅ [Tool Result] ${event.name}: ${content}`);
          }
          break;
        case EventType.SYSTEM:
          // Display system events based on level
          if (event.level === 'info') {
            console.info(`ℹ️ [System] ${event.message}`);
          } else if (event.level === 'warning') {
            console.warn(`⚠️ [System] ${event.message}`);
          } else if (event.level === 'error') {
            console.error(`❌ [System] ${event.message}`);
          }
          break;
      }
    });

    console.log('');
    console.log('==================================================');
    console.log('🤖 Agent TARS is ready! Type your query or /exit to quit.');
    console.log('==================================================');
    console.log('');

    // Create readline interface
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '👤 > ',
    });

    // Start prompt
    rl.prompt();

    // Process user input
    rl.on('line', async (line) => {
      const input = line.trim();

      // Handle special commands
      if (input.toLowerCase() === '/exit') {
        console.log('Exiting TARS Agent...');
        rl.close();
        return;
      }

      if (input === '') {
        rl.prompt();
        return;
      }

      try {
        // Create a user message event
        const userEvent = eventStream.createEvent(EventType.USER_MESSAGE, {
          content: input,
        });
        eventStream.addEvent(userEvent);

        console.log('\n🤖 Processing your request...');

        // Run the agent
        const response = await agent.run(input);

        console.log('\n--------------------------------------------------');
        console.log(`🤖 ${response}`);
        console.log('--------------------------------------------------\n');
      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
      }

      rl.prompt();
    });

    // Handle readline close
    rl.on('close', async () => {
      console.log('\nThanks for using Agent TARS! Goodbye.');
      unsubscribe();
      await agent.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start interactive mode:', error);
    await agent.cleanup();
    process.exit(1);
  }
}
