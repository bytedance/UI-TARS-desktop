#!/usr/bin/env node

/**
 * Debug script for changelog tagName issue
 */

const { execa } = require('execa');

async function debugChangelogTag() {
  const version = '0.0.6-beta.2';
  const tagPrefix = 'pdk@';
  const cwd = process.cwd();

  console.log('Debugging changelog tagName issue...\n');
  
  // Step 1: Check if repository info is available
  try {
    const { stdout } = await execa('git', ['config', '--get', 'remote.origin.url'], { cwd });
    console.log(`Git remote URL: ${stdout.trim()}`);
    
    const match = stdout.trim().match(/github\.com[:\/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
      const [, owner, repo] = match;
      console.log(`Parsed repository: ${owner}/${repo}`);
    } else {
      console.log('Failed to parse repository URL');
    }
  } catch (error) {
    console.log(`Error getting repository info: ${error.message}`);
  }

  // Step 2: Check if getRepositoryInfo returns boolean
  console.log('\nTesting getRepositoryInfo return type...');
  
  // This is where the issue might be - getRepositoryInfo might be returning a boolean
  try {
    const result = await getRepositoryInfo(cwd);
    console.log(`getRepositoryInfo result type: ${typeof result}`);
    console.log(`getRepositoryInfo result value: ${JSON.stringify(result)}`);
  } catch (error) {
    console.log(`Error calling getRepositoryInfo: ${error.message}`);
  }
}

debugChangelogTag();