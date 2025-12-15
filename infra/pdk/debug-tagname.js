#!/usr/bin/env node

/**
 * Debug script for tagName construction
 */

const { execa } = require('execa');

async function debugTagName() {
  const version = '0.0.6-beta.2';
  const tagPrefix = 'pdk@';
  const cwd = process.cwd();

  console.log('Debugging tagName construction...\n');
  console.log(`version: ${version}`);
  console.log(`tagPrefix: ${tagPrefix}`);
  console.log(`cwd: ${cwd}\n`);

  // Construct tag name - try to find actual git tag first
  let tagName = `${tagPrefix}${version}`;
  console.log(`Initial tagName: ${tagName}`);
  
  // Try to find actual git tag that matches this version
  try {
    const { stdout } = await execa('git', ['tag', '--list', `${tagPrefix}${version}`], { cwd });
    const matchingTags = stdout.trim().split('\n').filter(Boolean);
    console.log(`Matching tags: ${JSON.stringify(matchingTags)}`);
    if (matchingTags.length > 0) {
      // Use the actual tag that exists
      tagName = matchingTags[0];
      console.log(`Found existing tag, updated tagName: ${tagName}`);
    }
  } catch (error) {
    console.log(`Error finding tags: ${error.message}`);
    // Fall back to constructed tag name
  }

  console.log(`Final tagName: ${tagName}`);
}

debugTagName();