import { CodeActAgent } from '../src';
import path from 'path';
import os from 'os';

/**
 * This example demonstrates the enhanced code highlighting features
 * with boxed filenames and improved syntax highlighting, including LLM output
 */
async function main() {
  console.log('Starting CodeAct Highlighting Showcase...');

  // Create a workspace path
  const workspace = path.join(os.tmpdir(), 'codeact-highlight-showcase');

  // Create the agent with code execution capabilities and pretty printing
  const agent = new CodeActAgent({
    workspace,
    cleanupOnExit: true, // Automatically clean up workspace when done
    printToConsole: true, // Enable console printing with highlighting
    printLLMOutput: true, // Also print LLM model outputs
  });

  // Initialize the agent
  await agent.initialize();

  console.log('\n=== JavaScript Syntax Highlighting Example ===\n');

  // Run JavaScript example with complex syntax
  await agent.run(`
Write and execute a JavaScript function that demonstrates various syntax features that would benefit from syntax highlighting:
- Arrow functions
- Template literals
- Class definitions
- Async/await
- Object destructuring
- Comments (both single and multi-line)

Make the example visually interesting with different syntactic elements.
`);

  console.log('\n=== Python Syntax Highlighting Example ===\n');

  // Run Python example with various syntax features
  await agent.run(`
Write and execute a Python script that demonstrates various Python-specific syntax that would benefit from syntax highlighting:
- Class definitions
- Decorators
- List comprehensions
- f-strings
- Type hints
- Multi-line comments
- Exception handling

Make it visually interesting to showcase the new highlighting capabilities.
`);

  // Clean up resources
  await agent.cleanup();
  console.log('\nCodeAct Highlighting Showcase completed.');
}

main().catch(console.error);
