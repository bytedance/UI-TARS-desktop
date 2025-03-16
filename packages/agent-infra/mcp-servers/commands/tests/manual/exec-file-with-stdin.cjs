/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/tests/manual/exec-file-with-stdin.cjs
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
const { execFile } = require('child_process');

/**
 * Executes a file with the given arguments, piping input to stdin.
 * @param {string} file - The file to execute.
 * @param {string[]} args - Array of arguments for the file.
 * @param {string} input - The string to pipe to stdin.
 * @returns {Promise<{ stdout: string, stderr: string }>} Resolves with stdout and stderr.
 */
function execFileWithInputTest(file, args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

// Example usage
execFileWithInputTest('cat', [], 'Hello, world!')
  .then(({ stdout, stderr }) => {
    //throw new Error('This should not be executed'); // demo how catch would catch this too and yeah not desirable (necessarily)
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
  })
  .catch(({ error, stdout, stderr }) => {
    console.error('ERROR:', error);
    console.error('STDOUT:', stdout);
    console.error('STDERR:', stderr);
  });
