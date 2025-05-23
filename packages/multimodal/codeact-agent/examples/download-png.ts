import { CodeActAgent } from '../src';
import path from 'path';
import os from 'os';

async function main() {
  // Create a workspace path
  const workspace = path.join(os.tmpdir(), 'codeact-benchmark');

  // Create the agent with code execution capabilities
  const agent = new CodeActAgent({
    workspace,
    cleanupOnExit: true, // Automatically clean up workspace when done
    printToConsole: true, // Enable console printing with highlighting
  });

  // Initialize the agent
  await agent.initialize();

  // Run the agent
  const response = await agent.run('保存 bagel-ai.org 的截图');

  console.log('Agent response:', response.content);

  // Clean up resources
  await agent.cleanup();
}

main();
