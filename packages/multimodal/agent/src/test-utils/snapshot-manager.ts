/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Event } from '../types';
import { getLogger } from '../utils/logger';
import { deepCompareSortedJson, formatDiff } from './comparators';

const logger = getLogger('SnapshotManager');

/**
 * SnapshotManager - Manages test snapshots for agent testing
 *
 * Handles reading, writing, and comparing snapshots for LLM requests, responses,
 * and event streams.
 */
export class SnapshotManager {
  constructor(private fixturesRoot: string) {}

  /**
   * Get the path to a specific snapshot file
   */
  private getSnapshotPath(caseName: string, loopDir: string, filename: string): string {
    if (loopDir === '') {
      // Root level files are stored directly in the case directory
      return path.join(this.fixturesRoot, caseName, filename);
    }
    return path.join(this.fixturesRoot, caseName, loopDir, filename);
  }

  /**
   * Read a snapshot from the filesystem
   */
  async readSnapshot<T>(caseName: string, loopDir: string, filename: string): Promise<T | null> {
    const filePath = this.getSnapshotPath(caseName, loopDir, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`Error reading snapshot from ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Write a snapshot to the filesystem
   */
  async writeSnapshot<T>(
    caseName: string,
    loopDir: string,
    filename: string,
    data: T,
  ): Promise<void> {
    const filePath = this.getSnapshotPath(caseName, loopDir, filename);
    const dirPath = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }

    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.info(`Snapshot written to ${filePath}`);
    } catch (error) {
      logger.error(`Error writing snapshot to ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Verify that an event stream state matches the expected snapshot
   */
  async verifyEventStreamSnapshot(
    caseName: string,
    loopDir: string,
    actualEventStream: Event[],
    updateSnapshots = false,
  ): Promise<boolean> {
    const expectedEventStream = await this.readSnapshot<Event[]>(
      caseName,
      loopDir,
      'event-stream.jsonl',
    );

    if (!expectedEventStream) {
      if (updateSnapshots) {
        await this.writeSnapshot(caseName, loopDir, 'event-stream.jsonl', actualEventStream);
        logger.success(`✅ Created new event stream snapshot for ${caseName}/${loopDir}`);
        return true;
      }
      throw new Error(`No event stream snapshot found for ${caseName}/${loopDir}`);
    }

    // Compare event streams
    const result = deepCompareSortedJson(expectedEventStream, actualEventStream);
    if (!result.equal) {
      if (updateSnapshots) {
        logger.warn(`⚠️ Event stream doesn't match for ${caseName}/${loopDir}, updating snapshot`);
        await this.writeSnapshot(caseName, loopDir, 'event-stream.jsonl', actualEventStream);
        return true;
      }

      // Format the diff with colors for easier debugging
      const diffOutput = result.diff ? formatDiff(result.diff) : 'No detailed diff available';

      logger.error(
        `❌ Event stream comparison failed for ${caseName}/${loopDir}:\n${result.reason}\n${diffOutput}`,
      );

      throw new Error(`Event stream doesn't match for ${caseName}/${loopDir}: ${result.reason}`);
    }

    logger.success(`✅ Event stream comparison passed for ${caseName}/${loopDir}`);
    return true;
  }

  /**
   * Verify that a request matches the expected snapshot
   */
  async verifyRequestSnapshot(
    caseName: string,
    loopDir: string,
    actualRequest: any,
    updateSnapshots = false,
  ): Promise<boolean> {
    // Mock the persistence.
    actualRequest = JSON.parse(JSON.stringify(actualRequest));

    const expectedRequest = await this.readSnapshot<any>(caseName, loopDir, 'llm-request.jsonl');

    if (!expectedRequest) {
      if (updateSnapshots) {
        await this.writeSnapshot(caseName, loopDir, 'llm-request.jsonl', actualRequest);
        logger.success(`✅ Created new request snapshot for ${caseName}/${loopDir}`);
        return true;
      }
      throw new Error(`No request snapshot found for ${caseName}/${loopDir}`);
    }

    const result = deepCompareSortedJson(expectedRequest, actualRequest);
    if (!result.equal) {
      if (updateSnapshots) {
        logger.warn(`⚠️ Request doesn't match for ${caseName}/${loopDir}, updating snapshot`);
        await this.writeSnapshot(caseName, loopDir, 'llm-request.jsonl', actualRequest);
        return true;
      }

      const diffOutput = result.diff ? formatDiff(result.diff) : 'No detailed diff available';

      logger.error(
        `❌ Request comparison failed for ${caseName}/${loopDir}:\n${result.reason}\n${diffOutput}`,
      );

      throw new Error(`Request doesn't match for ${caseName}/${loopDir}: ${result.reason}`);
    }

    logger.success(`✅ LLM request comparison passed for ${caseName}/${loopDir}`);
    return true;
  }

  /**
   * Create a new test case directory structure
   */
  async createTestCaseStructure(caseName: string, numLoops: number): Promise<string> {
    const caseDir = path.join(this.fixturesRoot, caseName);

    // Create case directory
    if (!fs.existsSync(caseDir)) {
      await fs.promises.mkdir(caseDir, { recursive: true });
    }

    // Create loop directories
    for (let i = 1; i <= numLoops; i++) {
      const loopDir = path.join(caseDir, `loop-${i}`);
      if (!fs.existsSync(loopDir)) {
        await fs.promises.mkdir(loopDir, { recursive: true });
      }
    }

    return caseDir;
  }
}
