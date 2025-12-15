#!/usr/bin/env node

/**
 * Simple test to debug the tagName issue
 */

const { getRepositoryInfo } = require('./dist/index');

async function testRepoInfo() {
  console.log('Testing getRepositoryInfo...');
  
  const result = await getRepositoryInfo(process.cwd());
  console.log(`Type: ${typeof result}`);
  console.log(`Value: ${JSON.stringify(result)}`);
  console.log(`Is boolean: ${typeof result === 'boolean'}`);
  
  // This should help us understand what's happening
  if (typeof result === 'boolean') {
    console.log('ERROR: getRepositoryInfo is returning a boolean!');
    console.log('This is causing the tagName issue in changelog generation');
  }
}

testRepoInfo().catch(console.error);