/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInterface } from 'readline';
import { AgentTARS, AgentTARSOptions, EventType } from '@agent-tars/core';
import { ensureWorkingDirectory } from '@agent-tars/server';
import { CLIRenderer, ConfigInfo } from './cli-renderer';

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
 * Extract configuration information for display
 */
function extractConfigInfo(
  agent: AgentTARS,
  sessionId: string,
  workingDirectory: string,
  config: AgentTARSOptions,
): ConfigInfo {
  // Get model information
  const modelInfo = config.model?.use || {};
  const provider = modelInfo.provider || 'default';
  const model = modelInfo.model || 'default';

  // Get other relevant config
  const searchProvider = config.search?.provider;
  const browserMode = config.browser?.headless === false ? 'visible' : 'headless';

  // Prepare the config info
  const configInfo: ConfigInfo = {
    sessionId,
    workdir: workingDirectory,
    model,
    provider,
  };

  // Add optional configuration if available
  if (searchProvider) {
    configInfo.search = searchProvider;
  }

  if (config.browser) {
    configInfo.browser = browserMode;
  }

  return configInfo;
}

/**
 * Start the TARS agent in interactive mode on the command line
 */
export async function startInteractiveCLI(config: AgentTARSOptions = {}): Promise<void> {
  // Clear screen for a fresh start
  console.clear();

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

  agent.getLogger().info('Starting TARS Agent in interactive mode...');

  try {
    // Initialize agent
    await agent.initialize();

    // Create readline interface
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '❯ ',
    });

    // Initialize the CLI renderer with terminal width
    const renderer = new CLIRenderer(rl, {
      showTools: Boolean(process.env.AGENT_DEBUG), // Only show tools in debug mode
      showSystemEvents: Boolean(process.env.AGENT_DEBUG),
      terminalWidth: process.stdout.columns,
    });

    // Connect to event stream
    const eventStream = agent.getEventStream();

    // Extract and display configuration information
    const configInfo = extractConfigInfo(agent, sessionId, workingDirectory, config);
    renderer.printConfigBox(configInfo);

    // Subscribe to agent events for CLI output
    const unsubscribe = eventStream.subscribe((event) => {
      renderer.processAgentEvent(event);
    });

    // Display welcome message
    renderer.printWelcome();
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
        // Display user input
        renderer.printUserInput(input);
        renderer.printProcessing();

        // Run the agent
        const response = await agent.run(input);

        // Display response
        renderer.printAssistantResponse(response);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Update prompt for next input
      renderer.updatePrompt();
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
