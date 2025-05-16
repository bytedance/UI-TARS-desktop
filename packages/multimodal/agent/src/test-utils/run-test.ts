/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTestRunner } from './agent-test-runner';
import { getLogger } from '../utils/logger';

const logger = getLogger('TestRunner');

/**
 * Run a specific test case
 */
async function runTest(
  caseName: string,
  options: { updateSnapshots?: boolean } = {},
): Promise<void> {
  const runner = new AgentTestRunner();

  try {
    await runner.runTest({
      caseName,
      updateSnapshots: options.updateSnapshots || false,
    });
    logger.info(`✅ Test case ${caseName} passed`);
  } catch (error) {
    logger.error(`❌ Test case ${caseName} failed: ${error}`);
    throw error;
  }
}

/**
 * CLI entry point to run tests
 */
async function main() {
  const args = process.argv.slice(2);
  const updateFlag = args.includes('--update') || args.includes('-u');

  if (args.length === 0 || (args.length === 1 && updateFlag)) {
    logger.error('Please specify a test case name');
    logger.info('Usage: npm run test:agent [caseName] [--update]');
    process.exit(1);
  }

  // Get the case name (first non-flag argument)
  const caseName = args.find((arg) => !arg.startsWith('-'));

  if (!caseName) {
    logger.error('Please specify a test case name');
    logger.info('Usage: npm run test:agent [caseName] [--update]');
    process.exit(1);
  }

  try {
    await runTest(caseName, { updateSnapshots: updateFlag });
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// If this script is run directly, execute the main function
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}

export { runTest };
