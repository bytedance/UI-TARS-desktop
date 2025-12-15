#!/usr/bin/env node

/**
 * Debug script for getRepositoryInfo
 */

const { getRepositoryInfo } = require('./dist/index');

async function debugRepositoryInfo() {
  console.log('Debugging getRepositoryInfo...\n');
  
  try {
    const result = await getRepositoryInfo(process.cwd());
    console.log(`Repository info: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

debugRepositoryInfo();