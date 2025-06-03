import { CodeActAgent, LogLevel } from '../src';
import path from 'path';
import os from 'os';

async function main() {
  // Create a workspace path
  const workspace = path.join(os.tmpdir(), 'codeact-highlight-demo');

  // Create the agent with code execution capabilities and console printing
  const agent = new CodeActAgent({
    workspace,
    cleanupOnExit: true, // Automatically clean up workspace when done
    printToConsole: true, // Enable console printing with highlighting
  });

  // Initialize the agent
  await agent.initialize();

  // Run the agent with Python code
  console.log('\n=== Running Python Code Example ===\n');
  await agent.run(`
Can you run a simple Python script that calculates the Fibonacci sequence up to the 10th number? 
Print each number in the sequence.
`);

  // Run the agent with JavaScript code
  console.log('\n=== Running JavaScript Code Example ===\n');
  await agent.run(`
Please write and run a JavaScript function that checks if a string is a palindrome. 
Test it with the words "racecar", "hello", and "A man, a plan, a canal, Panama".
`);

  // Clean up resources
  await agent.cleanup();
}

main().catch(console.error);
