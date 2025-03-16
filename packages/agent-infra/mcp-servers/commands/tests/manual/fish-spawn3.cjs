/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/tests/manual/fish-spawn3.cjs
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
const { spawn } = require('child_process');

// Original script
const script = `
echo "Hello from Fish shell!"
set greeting "Hello, \"Node.js!\""
echo $greeting
`;

// Encode the script in Base64
const base64Script = Buffer.from(script).toString('base64');

// Use echo to pipe the Base64 script into Fish, decode, and execute
const child = spawn(
  'sh',
  ['-c', `echo "${base64Script}" | base64 --decode | fish`],
  {
    stdio: ['inherit', 'inherit', 'inherit'], // Inherit all standard streams
  },
);

child.on('close', (code) => {
  console.log(`Fish shell exited with code ${code}`);
});
