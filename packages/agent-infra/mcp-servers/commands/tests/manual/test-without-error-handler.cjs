/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/tests/manual/test-without-error-handler.cjs
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

async function main() {
  const { argv } = process;
  const { stdout, stderr } = await exec(argv[2]);
  console.log('stdout:', stdout);
  console.error('stderr:', stderr);
}

main();
