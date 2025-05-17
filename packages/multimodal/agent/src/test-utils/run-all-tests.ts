/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { runTest } from './run-test';
import { getLogger } from '../utils/logger';

const logger = getLogger('TestRunner');

/**
 * Run all test cases found in the fixtures directory
 */
async function runAllTests(options: { updateSnapshots?: boolean } = {}): Promise<void> {
  const fixturesRoot = path.join(process.cwd(), 'fixtures');

  if (!fs.existsSync(fixturesRoot)) {
    logger.error(`Fixtures directory not found: ${fixturesRoot}`);
    process.exit(1);
  }

  // Get all directories in the fixtures root (each directory is a test case)
  const testCases = fs
    .readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .filter((dirent) => fs.existsSync(path.join(fixturesRoot, dirent.name, 'setup.ts')))
    .map((dirent) => dirent.name);

  if (testCases.length === 0) {
    logger.warn('No test cases found in fixtures directory');
    process.exit(0);
  }

  logger.info(`Found ${testCases.length} test cases: ${testCases.join(', ')}`);

  let passed = 0;
  let failed = 0;
  const failedTests: string[] = [];

  // Run each test case
  for (const testCase of testCases) {
    logger.info(`\n========================================`);
    logger.info(
      `Running test case: ${testCase} (${testCases.indexOf(testCase) + 1}/${testCases.length})`,
    );
    logger.info(`========================================\n`);

    try {
      await runTest(testCase, options);
      passed++;
      logger.success(`✓ Test case ${testCase} passed`);
    } catch (error) {
      failed++;
      failedTests.push(testCase);
      logger.error(`✗ Test case ${testCase} failed: ${error}`);
      // Continue with next test case instead of exiting
    }
  }

  // Print summary
  logger.info(`\n========================================`);
  logger.info(`Test Summary:`);
  logger.info(`========================================`);
  logger.info(`Total: ${testCases.length}`);
  logger.info(`Passed: ${passed}`);
  logger.info(`Failed: ${failed}`);

  if (failed > 0) {
    logger.error(`Failed test cases: ${failedTests.join(', ')}`);
    process.exit(1);
  } else {
    logger.success('All test cases passed!');
    process.exit(0);
  }
}

// If this script is run directly, execute the main function
if (require.main === module) {
  const args = process.argv.slice(2);
  const updateFlag = args.includes('--update') || args.includes('-u');

  runAllTests({ updateSnapshots: updateFlag }).catch((error) => {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}

export { runAllTests };
