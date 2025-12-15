#!/usr/bin/env node

/**
 * Debug script for changelog generation
 */

const { execa } = require('execa');

async function debugChangelog() {
  const version = '0.0.6-beta.2';
  const tagPrefix = 'pdk@';
  const cwd = process.cwd();

  console.log('Debugging changelog generation...\n');
  
  // Construct tag name
  let tagName = `${tagPrefix}${version}`;
  console.log(`Constructed tagName: ${tagName}`);
  
  // Check if tag exists
  try {
    const { stdout } = await execa('git', ['tag', '--list', `${tagPrefix}${version}`], { cwd });
    const matchingTags = stdout.trim().split('\n').filter(Boolean);
    console.log(`Matching tags: ${JSON.stringify(matchingTags)}`);
  } catch (error) {
    console.log(`Error checking tags: ${error.message}`);
  }

  // Get previous tag
  try {
    const { stdout } = await execa('git', ['tag', '--sort=-creatordate'], { cwd });
    const allTags = stdout.trim().split('\n').filter(Boolean);
    console.log(`All tags: ${JSON.stringify(allTags.slice(0, 10))}`);
    
    // Filter out canary releases and apply tagPrefix filter
    let filteredTags = allTags.filter((tag) => !tag.includes('canary'));
    filteredTags = filteredTags.filter((tag) => tag.startsWith(tagPrefix));
    console.log(`Filtered tags: ${JSON.stringify(filteredTags.slice(0, 10))}`);
    
    // Find current tag
    const currentIndex = filteredTags.findIndex((tag) => tag === tagName);
    console.log(`Current tag index: ${currentIndex}`);
    
    if (currentIndex === -1) {
      const previousTag = filteredTags[0] || null;
      console.log(`Previous tag (current not found): ${previousTag}`);
    } else if (currentIndex < filteredTags.length - 1) {
      const previousTag = filteredTags[currentIndex + 1];
      console.log(`Previous tag (found): ${previousTag}`);
    }
  } catch (error) {
    console.log(`Error getting previous tag: ${error.message}`);
  }
}

debugChangelog();