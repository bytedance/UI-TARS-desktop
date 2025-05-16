/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Agent } from '../agent';
import { SnapshotManager } from './snapshot-manager';
import { LLMMocker } from './llm-mocker';
import { getLogger } from '../utils/logger';
import { EventStream } from '../stream/event-stream';
import { AgentRunObjectOptions, AgentRunOptions } from '../types';

const logger = getLogger('AgentTestRunner');

interface RunTestOptions {
  /**
   * Name of the test case - corresponds to the directory name in fixtures
   */
  caseName: string;
  /**
   * Whether to update snapshots when they don't match
   */
  updateSnapshots?: boolean;
}

/**
 * AgentTestRunner - A test utility that runs agent tests against filesystem fixtures
 *
 * This runner loads test case data from the filesystem, mocks LLM responses, and verifies
 * that the agent's behavior matches the expected state transitions in each loop.
 */
export class AgentTestRunner {
  private snapshotManager: SnapshotManager;
  private llmMocker: LLMMocker;
  private fixturesRoot: string;

  constructor(options?: { fixturesRoot?: string }) {
    this.fixturesRoot = options?.fixturesRoot || path.join(process.cwd(), 'fixtures');
    this.snapshotManager = new SnapshotManager(this.fixturesRoot);
    this.llmMocker = new LLMMocker();
  }

  /**
   * Run a test case against a fixture directory
   */
  async runTest({ caseName, updateSnapshots = false }: RunTestOptions): Promise<void> {
    const casePath = path.join(this.fixturesRoot, caseName);

    // Verify the case directory exists
    if (!fs.existsSync(casePath)) {
      throw new Error(`Test case directory not found: ${casePath}`);
    }

    // Load setup module
    const setupPath = path.join(casePath, 'setup.ts');
    if (!fs.existsSync(setupPath)) {
      throw new Error(`Setup file not found: ${setupPath}`);
    }

    logger.info(`\n🚀 Running test case: ${caseName}${updateSnapshots ? ' (update mode)' : ''}`);

    // Import setup module
    const { agent, runOptions } = (await import(setupPath)) as {
      agent: Agent;
      runOptions: AgentRunObjectOptions;
    };

    // Count how many loop directories exist
    const loopDirs = fs
      .readdirSync(casePath)
      .filter(
        (dir) => dir.startsWith('loop-') && fs.statSync(path.join(casePath, dir)).isDirectory(),
      )
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1], 10);
        const numB = parseInt(b.split('-')[1], 10);
        return numA - numB;
      });

    const totalLoops = loopDirs.length;
    logger.info(`📂 Found ${totalLoops} loops in test case`);

    // Mock the LLM client to intercept requests
    this.llmMocker.setup(agent, casePath, totalLoops, { updateSnapshots });

    // Run the agent
    let result;
    try {
      // @ts-expect-error
      result = await agent.run(runOptions);
      logger.success(`✅ Agent execution completed successfully`);
      if (typeof result === 'string') {
        logger.info(`📝 Result: ${result}`);
      }
    } catch (error) {
      logger.error(`❌ Agent execution failed: ${error}`);
      throw error;
    } finally {
      // Verify final event stream state after agent completes
      logger.info(`🔍 Verifying final event stream state after agent completion`);
      try {
        // Get final events from the agent's event stream
        const finalEvents = agent.getEventStream().getEvents();
        await this.snapshotManager.verifyEventStreamSnapshot(
          caseName,
          '', // Root level snapshot
          finalEvents,
          updateSnapshots,
        );
        logger.success(`✅ Final event stream verification succeeded`);
      } catch (error) {
        logger.error(`❌ Final event stream verification failed: ${error}`);
        if (!updateSnapshots) {
          // Clean up mocking before throwing
          this.llmMocker.restore();
          throw error;
        }
      }

      // Cleanup mocking
      this.llmMocker.restore();
    }

    let verificationSuccess = true;

    if (verificationSuccess) {
      logger.success(`\n✨ Test case ${caseName} completed successfully ✨\n`);
    } else if (updateSnapshots) {
      logger.warn(
        `\n⚠️ Test case ${caseName} had verification failures, but snapshots were updated ⚠️\n`,
      );
    }
  }
}
