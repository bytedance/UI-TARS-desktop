#!/usr/bin/env node

function main() {
  try {
    const { run } = require('../dist/cli/commands');
    run();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
