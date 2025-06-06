/* eslint-disable no-inner-declarations */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';
import { CodeActAgent, CodeActAgentOptions } from '..';
import { CLIRenderer, ConfigInfo } from './cli-renderer';
import { ensureWorkspace, toUserFriendlyPath, generateSessionId } from './utils';
import { EventType } from '@multimodal/agent';
import chalk from 'chalk';

/**
 * Handle special CLI commands
 */
async function handleSpecialCommands(
  input: string,
  agent: CodeActAgent,
  renderer: CLIRenderer,
  isDebug: boolean,
): Promise<boolean> {
  // 获取第一个空格前的部分作为命令
  const parts = input.trim().split(/\s+(.*)/);
  const command = parts[0].toLowerCase();

  // Exit command
  if (command === '/exit' || command === '/quit') {
    console.log('\nExiting CodeAct CLI...');
    return true;
  }

  // Help command
  if (command === '/help') {
    console.log('\nAvailable commands:');
    console.log('  /help     - Show this help message');
    console.log('  /exit     - Exit the CLI');
    console.log('  /quit     - Same as /exit');
    console.log('  /clear    - Clear the screen');
    console.log('\nAll other input will be sent directly to the agent.');
    console.log('Press Enter to submit your input.');
    renderer.updatePrompt();
    return true;
  }

  // Clear screen
  if (command === '/clear') {
    console.clear();
    renderer.printWelcome();
    renderer.updatePrompt();
    return true;
  }

  // Not a special command
  return false;
}

/**
 * Process user input with the agent
 */
async function processAgentInput(
  input: string,
  agent: CodeActAgent,
  renderer: CLIRenderer,
  isDebug: boolean,
): Promise<void> {
  try {
    // Skip empty input
    if (!input.trim()) {
      renderer.updatePrompt();
      return;
    }

    // Display user input
    renderer.printUserInput(input);

    // Start streaming mode
    renderer.startAssistantResponseStreaming();

    // Run the agent with streaming
    const streamResponse = await agent.run({
      input,
      stream: true, // Enable streaming
    });

    // Process the stream events
    for await (const event of streamResponse) {
      // We don't need to do anything here as the event subscription will handle
      // displaying streaming content through the renderer
    }

    // Finalize the response
    renderer.finalizeAssistantResponseStreaming();
  } catch (error) {
    console.error(
      `Error processing input: ${error instanceof Error ? error.message : String(error)}`,
    );
    renderer.updatePrompt();
  }
}

/**
 * Start the CodeAct agent in interactive mode on the command line
 */
export async function startInteractiveCLI(
  config: CodeActAgentOptions = {},
  isDebug = false,
): Promise<void> {
  console.clear(); // Start with a clean screen

  // Create workspace
  const workspacePath = ensureWorkspace(config.workspace);
  const sessionId = generateSessionId();

  // Configure agent options
  const agentOptions = {
    ...config,
    workspace: workspacePath,
    enableNodeCodeAct: config.enableNodeCodeAct !== false,
    enablePythonCodeAct: config.enablePythonCodeAct !== false,
    enableShellCodeAct: config.enableShellCodeAct !== false,
    cleanupOnExit: config.cleanupOnExit !== false,
    printToConsole: true,
    printLLMOutput: config.printLLMOutput,
  };

  // Initialize agent
  const agent = new CodeActAgent(agentOptions);

  let renderer: CLIRenderer | null = null;

  try {
    // Initialize agent
    await agent.initialize();

    // Create readline interface
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan.bold('> '),
      historySize: 100,
      terminal: true,
    });

    // Initialize the CLI renderer
    renderer = new CLIRenderer(rl, {
      showDetails: true,
      terminalWidth: process.stdout.columns || 80,
      debug: isDebug,
    });

    // Connect real-time output handler to renderer
    agent.setRealTimeOutputHandler((chunk, isError) => {
      if (renderer) {
        renderer.handleSandboxOutput(chunk, isError);
      }
    });

    // Extract and display configuration information
    const configInfo: ConfigInfo = {
      workspacePath: toUserFriendlyPath(workspacePath),
      nodeEnabled: agentOptions.enableNodeCodeAct,
      pythonEnabled: agentOptions.enablePythonCodeAct,
      shellEnabled: agentOptions.enableShellCodeAct,
      cleanupOnExit: agentOptions.cleanupOnExit,
    };

    // Add model information if provided
    if (config.model?.use) {
      if (config.model.use.provider) configInfo.provider = config.model.use.provider;
      if (config.model.use.model) configInfo.model = config.model.use.model;
    }

    // Add thinking mode information if enabled
    if (config.thinking?.type === 'enabled') {
      configInfo.thinking = 'enabled';
    }

    // Display config
    renderer.printConfigBox(configInfo);

    // Subscribe to agent events for CLI output
    const eventStream = agent.getEventStream();

    // Process the stream events
    eventStream.subscribe((event) => {
      if (renderer) {
        renderer.processAgentEvent(event);
      }
    });

    // Display welcome message
    renderer.printWelcome();
    console.log(chalk.cyan('\nCodeAct CLI is ready.'));
    console.log(
      chalk.dim(
        'Type /help for available commands or start typing your query.\nPress Enter to submit your input.\n',
      ),
    );

    // 修改输入处理以处理多行粘贴
    rl.on('line', async (input) => {
      // 防止处理中重复处理输入
      if (renderer!.isProcessing) {
        return;
      }

      // Check for special commands
      const isSpecialCommand = await handleSpecialCommands(input, agent, renderer!, isDebug);

      if (!isSpecialCommand && input.trim()) {
        await processAgentInput(input, agent, renderer!, isDebug);
      }

      renderer!.updatePrompt();
    });

    // Start the prompt
    renderer.updatePrompt();

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT. Shutting down gracefully...');
      if (renderer) {
        renderer.cleanup();
      }
      await agent.cleanup();
      process.exit(0);
    });

    // Handle when readline interface is closed
    rl.on('close', async () => {
      console.log('\nThank you for using CodeAct CLI!');
      if (renderer) {
        renderer.cleanup();
      }
      await agent.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error(
      'Failed to start interactive mode:',
      error instanceof Error ? error.message : String(error),
    );
    if (renderer) {
      renderer.cleanup();
    }
    await agent.cleanup();
    process.exit(1);
  }
}
