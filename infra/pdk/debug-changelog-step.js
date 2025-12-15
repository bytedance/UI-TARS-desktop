#!/usr/bin/env node

/**
 * Debug changelog function step by step
 */

const { execa } = require('execa');
const { getRepositoryInfo, getPreviousTag, generateReleaseNotes } = require('./dist/index');

async function debugChangelogStepByStep() {
  const version = '0.0.6-beta.2';
  const tagPrefix = 'pdk@';
  const cwd = process.cwd();

  console.log('=== Debugging changelog step by step ===\n');

  // Step 1: Construct tag name
  console.log('Step 1: Constructing tag name');
  let tagName = `${tagPrefix}${version}`;
  console.log(`Initial tagName: ${tagName}`);
  
  try {
    const { stdout } = await execa('git', ['tag', '--list', `${tagPrefix}${version}`], { cwd });
    const matchingTags = stdout.trim().split('\n').filter(Boolean);
    console.log(`Matching tags: ${JSON.stringify(matchingTags)}`);
    if (matchingTags.length > 0) {
      tagName = matchingTags[0];
      console.log(`Updated tagName: ${tagName}`);
    }
  } catch (error) {
    console.log(`Error checking tags: ${error.message}`);
  }
  console.log(`Final tagName: ${tagName}`);
  console.log(`tagName type: ${typeof tagName}`);

  // Step 2: Get repository info
  console.log('\nStep 2: Getting repository info');
  const repoInfo = await getRepositoryInfo(cwd);
  console.log(`repoInfo: ${JSON.stringify(repoInfo)}`);
  console.log(`repoInfo type: ${typeof repoInfo}`);

  // Step 3: Get previous tag
  console.log('\nStep 3: Getting previous tag');
  const previousTag = await getPreviousTag(tagName, cwd, tagPrefix);
  console.log(`previousTag: ${previousTag}`);
  console.log(`previousTag type: ${typeof previousTag}`);

  // Step 4: Generate release notes
  console.log('\nStep 4: Generating release notes');
  try {
    const releaseNotes = await generateReleaseNotes(
      tagName,
      previousTag,
      cwd,
      repoInfo || undefined,
    );
    console.log('Release notes generated successfully');
    console.log(`Release notes length: ${releaseNotes.length}`);
    console.log(`First 100 chars: ${releaseNotes.substring(0, 100)}`);
  } catch (error) {
    console.log(`Error generating release notes: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
  }

  // Step 5: Check entry composition
  console.log('\nStep 5: Check entry composition');
  const today = new Date().toISOString().split('T')[0];
  const entry = `## ${tagName} (${today})\\n\\nRelease notes placeholder\\n`;
  console.log(`Entry: ${entry}`);
  console.log(`Entry type: ${typeof entry}`);
}

debugChangelogStepByStep().catch(console.error);