#!/usr/bin/env node
const { execSync } = require('child_process');
const { platform } = require('os');
const path = require('path');
const fs = require('fs');

const COMMANDS = {
  rm: handleRm,
  chmod: handleChmod,
};

function main() {
  const [command, target] = process.argv.slice(2);

  if (!command || !COMMANDS[command]) {
    console.error('Usage: node script.js <rm|chmod> <path>');
    process.exit(1);
  }

  if (!target) {
    console.error('Error: Target path is required');
    process.exit(1);
  }

  const resolvedPath = path.resolve(target);
  COMMANDS[command](resolvedPath);
}

function handleRm(targetPath) {
  try {
    if (!fs.existsSync(targetPath)) {
      console.log(`Path ${targetPath} does not exist, skipping delete`);
      return;
    }

    if (isWindows()) {
      execSync(`rmdir /s /q "${targetPath}"`, { stdio: 'inherit' });
    } else {
      execSync(`rm -rf "${targetPath}"`, { stdio: 'inherit' });
    }

    console.log(`Successfully deleted: ${targetPath}`);
  } catch (error) {
    console.error(`Delete failed: ${error.message}`);
    process.exit(1);
  }
}

function handleChmod(targetPath) {
  try {
    if (isWindows()) {
      console.log('Windows skips chmod operation');
      return;
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path not found: ${targetPath}`);
    }

    execSync(`shx chmod +x ${targetPath}`, { stdio: 'inherit' });
    console.log(`Permissions updated for: ${targetPath}`);
  } catch (error) {
    console.error(`Chmod failed: ${error.message}`);
    process.exit(1);
  }
}

function isWindows() {
  return platform() === 'win32';
}

main();
