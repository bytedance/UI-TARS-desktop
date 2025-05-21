/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Event } from '@multimodal/agent-interface';
import { logger } from './utils/logger';
import { deepCompareSortedJson, formatDiff } from './utils/comparators';

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
      const content = fs.readFileSync(filePath, 'utf-8');

      // Special handling for llm-response.jsonl files
      if (filename === 'llm-response.jsonl') {
        try {
          // First try to parse as a single response object
          return JSON.parse(content) as T;
        } catch (parseError) {
          // If that fails, try to parse as a streaming response (array of chunks)
          // Split by newlines, filter out empty lines, and parse each line
          const lines = content.split('\n').filter((line) => line.trim());
          if (lines.length > 0) {
            try {
              // Try parsing each line and combine into an array
              const chunks = lines.map((line) => JSON.parse(line));
              return chunks as unknown as T;
            } catch (lineParseError) {
              logger.error(`Error parsing LLM response as streaming format: ${lineParseError}`);
              throw lineParseError;
            }
          }
          throw parseError;
        }
      }

      // Standard parsing for other file types
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
   * Write actual data to a separate file when verification fails
   */
  private async writeActualData<T>(
    caseName: string,
    loopDir: string,
    filename: string,
    data: T,
  ): Promise<void> {
    // Generate actual filename by inserting .actual before the extension
    const actualFilename = filename.replace(/(\.[^.]+)$/, '.actual$1');
    await this.writeSnapshot(caseName, loopDir, actualFilename, data);
    logger.info(
      `Actual data written to ${this.getSnapshotPath(caseName, loopDir, actualFilename)}`,
    );
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
    const filename = 'event-stream.jsonl';
    const expectedEventStream = await this.readSnapshot<Event[]>(caseName, loopDir, filename);

    if (!expectedEventStream) {
      if (updateSnapshots) {
        await this.writeSnapshot(caseName, loopDir, filename, actualEventStream);
        logger.success(`✅ Created new event stream snapshot for ${caseName}/${loopDir}`);
        return true;
      }
      throw new Error(`No event stream snapshot found for ${caseName}/${loopDir}`);
    }

    // Compare event streams
    const result = deepCompareSortedJson(expectedEventStream, actualEventStream);
    if (!result.equal) {
      // Always write actual data for diagnostics
      await this.writeActualData(caseName, loopDir, filename, actualEventStream);

      if (updateSnapshots) {
        logger.warn(`⚠️ Event stream doesn't match for ${caseName}/${loopDir}, updating snapshot`);
        await this.writeSnapshot(caseName, loopDir, filename, actualEventStream);
        return true;
      }

      // Format the diff with colors for easier debugging
      const diffOutput = result.diff ? formatDiff(result.diff) : 'No detailed diff available';

      logger.error(
        `❌ Event stream comparison failed for ${caseName}/${loopDir}:\n${result.reason}\n${diffOutput}`,
      );

      throw new Error(
        `Event stream doesn't match for ${caseName}/${loopDir}: ${result.reason}. ` +
          `Actual data saved to ${loopDir ? `${loopDir}/` : ''}event-stream.actual.jsonl`,
      );
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
    actualRequest: Record<string, unknown>,
    updateSnapshots = false,
  ): Promise<boolean> {
    // Clone the request to prevent modifications
    actualRequest = JSON.parse(JSON.stringify(actualRequest));
    const filename = 'llm-request.jsonl';

    const expectedRequest = await this.readSnapshot<Record<string, unknown>>(
      caseName,
      loopDir,
      filename,
    );

    if (!expectedRequest) {
      if (updateSnapshots) {
        await this.writeSnapshot(caseName, loopDir, filename, actualRequest);
        logger.success(`✅ Created new request snapshot for ${caseName}/${loopDir}`);
        return true;
      }
      throw new Error(`No request snapshot found for ${caseName}/${loopDir}`);
    }

    const result = deepCompareSortedJson(expectedRequest, actualRequest);
    if (!result.equal) {
      // Always write actual data for diagnostics
      await this.writeActualData(caseName, loopDir, filename, actualRequest);

      if (updateSnapshots) {
        logger.warn(`⚠️ Request doesn't match for ${caseName}/${loopDir}, updating snapshot`);
        await this.writeSnapshot(caseName, loopDir, filename, actualRequest);
        return true;
      }

      const diffOutput = result.diff ? formatDiff(result.diff) : 'No detailed diff available';

      logger.error(
        `❌ Request comparison failed for ${caseName}/${loopDir}:\n${result.reason}\n${diffOutput}`,
      );

      throw new Error(
        `Request doesn't match for ${caseName}/${loopDir}: ${result.reason}. ` +
          `Actual data saved to ${loopDir}/llm-request.actual.jsonl`,
      );
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

    // Create initial directory for pre-loop state
    const initialDir = path.join(caseDir, 'initial');
    if (!fs.existsSync(initialDir)) {
      await fs.promises.mkdir(initialDir, { recursive: true });
    }

    return caseDir;
  }

  /**
   * Write streaming chunks to a JSONL format file
   */
  async writeStreamingChunks<T>(
    caseName: string,
    loopDir: string,
    filename: string,
    chunks: T[],
    updateIfExists = false,
  ): Promise<void> {
    const filePath = this.getSnapshotPath(caseName, loopDir, filename);
    const dirPath = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }

    // Check if file already exists and shouldn't be updated
    if (fs.existsSync(filePath) && !updateIfExists) {
      logger.info(`Skipping write to existing file: ${filePath}`);
      return;
    }

    try {
      // Serialize each chunk as a separate JSON line
      const chunksAsJsonLines = chunks.map((chunk) => JSON.stringify(chunk)).join('\n');
      await fs.promises.writeFile(filePath, chunksAsJsonLines, 'utf-8');
      logger.info(`Stream chunks written to ${filePath} (${chunks.length} chunks)`);
    } catch (error) {
      logger.error(`Error writing stream chunks to ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Read streaming chunks from a JSONL format file
   */
  async readStreamingChunks<T>(caseName: string, loopDir: string, filename: string): Promise<T[]> {
    const filePath = this.getSnapshotPath(caseName, loopDir, filename);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      // Split by lines, filter empty lines, parse each line
      const lines = content.split('\n').filter((line) => line.trim());
      if (lines.length === 0) {
        return [];
      }

      try {
        // Parse each line as an object
        return lines.map((line) => JSON.parse(line)) as T[];
      } catch (lineParseError) {
        logger.error(`Error parsing streaming chunks: ${lineParseError}`);
        throw lineParseError;
      }
    } catch (error) {
      logger.error(`Error reading streaming chunks from ${filePath}: ${error}`);
      return [];
    }
  }
}
