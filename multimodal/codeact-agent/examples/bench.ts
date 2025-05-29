import { CodeActAgent } from '../src';
import path from 'path';
import os from 'os';

async function main() {
  // Create the agent with code execution capabilities
  // If no workspace is provided, it will use ~/.codeact
  const agent = new CodeActAgent({
    cleanupOnExit: false, // Don't clean up workspace to reuse
    printToConsole: true, // Enable console printing with highlighting
  });

  // Initialize the agent
  await agent.initialize();

  // Run the agent
  const response = await agent.run(`
Can you benchmark these two ID generation approaches and tell me which one is faster?

1. \`msg_\${Date.now()}_\${Math.random().toString(36).substring(2, 10)}\`
2. nanoid library: \`nanoid()\`

Please write code to run at least 100,000 iterations of each approach and measure the performance. 
Also provide examples of the generated IDs from each approach.
`);

  console.log('Agent response:', response.content);

  // Clean up resources (but not the workspace)
  await agent.cleanup();
}

main();
