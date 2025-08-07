/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComposableAgent,
  ComposableAgentOptions,
  ToolCallEngineCompositionConfig,
  ComposableToolCallEngineFactory,
  createComposableToolCallEngineFactory,
} from '@omni-tars/core';
import { mcpPlugin, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { codePlugin, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';

/**
 * Example: Creating a comprehensive agent with multiple tool call engines
 */
async function createComposableAgent() {
  const toolCallEngine = createComposableToolCallEngineFactory({
    engines: [
      // GUI has highest priority for GUI-related tasks
      new GuiToolCallEngineProvider(),

      // MCP has high priority for search and web tasks
      new McpToolCallEngineProvider(),

      // Code has medium priority for development tasks
      new CodeToolCallEngineProvider(),
    ],
  });

  // Create the composable agent
  const options: ComposableAgentOptions = {
    name: 'Omni Agent',
    plugins: [mcpPlugin, codePlugin, guiPlugin],
    toolCallEngine,
    maxIterations: 50,
    temperature: 0.7,
  };

  const agent = new ComposableAgent(options);
  await agent.initialize();

  return agent;
}

/**
 * Example: Using the agent for different types of tasks
 */
async function demonstrateToolCallEngineSelection() {
  const agent = await createComposableAgent();

  console.log('=== Tool Call Engine Selection Demo ===\n');

  // Task 1: GUI automation task - should use GuiToolCallEngine
  console.log('1. GUI automation task:');
  const guiResponse = await agent.run(
    'Take a screenshot of the current screen and click on the browser icon',
  );
  console.log('Response:', guiResponse);
  console.log('Expected engine: gui-tool-call-engine\n');

  // Task 2: Web search task - should use McpToolCallEngine
  console.log('2. Web search task:');
  const searchResponse = await agent.run(
    'Search for the latest news about artificial intelligence',
  );
  console.log('Response:', searchResponse);
  console.log('Expected engine: mcp-tool-call-engine\n');

  // Task 3: Code execution task - should use CodeToolCallEngine
  console.log('3. Code execution task:');
  const codeResponse = await agent.run(
    'Create a Python script that calculates fibonacci numbers and run it',
  );
  console.log('Response:', codeResponse);
  console.log('Expected engine: code-tool-call-engine\n');

  // Task 4: Mixed task - engine selection based on primary task type
  console.log('4. Mixed task:');
  const mixedResponse = await agent.run(
    'Search for Python tutorials online, then create a simple Python script based on what you find',
  );
  console.log('Response:', mixedResponse);
  console.log('Expected engine: Adaptive based on available tools\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await demonstrateToolCallEngineSelection();
    } catch (error) {
      console.error('Error running examples:', error);
    }
  })();
}
