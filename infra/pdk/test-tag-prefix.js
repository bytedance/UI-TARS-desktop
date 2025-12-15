#!/usr/bin/env node

/**
 * Test script for tagPrefix functionality
 */

const { getPreviousTag } = require('./dist/index');

async function testGetPreviousTag() {
  console.log('Testing getPreviousTag with tagPrefix filtering...\n');

  try {
    // Test with pdk@ tagPrefix
    console.log('Test 1: pdk@ tagPrefix');
    const result1 = await getPreviousTag('pdk@0.0.6-beta.1', process.cwd(), 'pdk@');
    console.log(`Result: ${result1}\n`);

    // Test with v tagPrefix
    console.log('Test 2: v tagPrefix');
    const result2 = await getPreviousTag('v0.3.0', process.cwd(), 'v');
    console.log(`Result: ${result2}\n`);

    // Test with @agent-tars@ tagPrefix
    console.log('Test 3: @agent-tars@ tagPrefix');
    const result3 = await getPreviousTag('@agent-tars@0.3.0-beta.1', process.cwd(), '@agent-tars@');
    console.log(`Result: ${result3}\n`);

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testGetPreviousTag();