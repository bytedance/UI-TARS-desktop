/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/tests/manual/test-with-error.cjs
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    // Handle successful output
    console.log('Command succeeded with output:');
    console.log('stdout:', stdout);
    console.log('stderr:', stderr); // Stderr may still contain warnings
  } catch (error) {
    // Catch errors and still access stdout/stderr
    console.error('error:', error.message);
    console.error('stdout:', error.stdout); // Stdout on error
    console.error('stderr:', error.stderr); // Stderr on error
  }
}

// Example usage
//runCommand('ls invalid-folder'); // Command likely to fail
//runCommand('echo "Hello, World!"'); // Command likely to succeed
//
const { argv } = process;
if (argv.length < 3) {
  console.log('Usage: node test2.cjs <command> <args...>');
  process.exit(1);
}

runCommand(argv.slice(2).join(' '));
