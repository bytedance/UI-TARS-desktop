/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { AgentEventStream } from '@tarko/agent-interface';
import { logger } from './utils/logger';
import { AgentNormalizerConfig, AgentSnapshotNormalizer } from './utils/snapshot-normalizer';
import { ToolCallData } from './utils/tool-call-tracker';



/**
 * SnapshotManager - Manages test snapshots for agent testing
 *
 * Handles reading, writing, and comparing snapshots for LLM requests, responses,
 * and event streams.
 */
export class SnapshotManager {
  private normalizer: AgentSnapshotNormalizer;

  constructor(
    private fixturesRoot: string,
    normalizerConfig?: AgentNormalizerConfig,
  ) {
    this.normalizer = new AgentSnapshotNormalizer(normalizerConfig);
  }

  /**
   * Get the path to a specific snapshot file
   */
  private getSnapshotPath(caseName: string, loopDir: string, filename: string): string {
    if (loopDir === '') {
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

      if (filename === 'llm-response.jsonl') {
        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          const lines = content.split('\n').filter((line) => line.trim());
          if (lines.length > 0) {
            try {
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

  private getActualFilename(filename: string): string {
    return filename.replace(/(\.[^.]+)$/, '.actual$1');
  }

  /**
   * Write actual data to a separate file when verification fails
   */
  private async writeActualData<T>(
    caseName: string,
    loopDir: string,
    filename: string,
    data: T,
  ): Promise<string> {
    const actualFilename = this.getActualFilename(filename);
    const actualFilePath = this.getSnapshotPath(caseName, loopDir, actualFilename);

    await this.writeSnapshot(caseName, loopDir, actualFilename, data);
    logger.info(`Actual data written to ${actualFilePath}`);

    return actualFilePath;
  }

  /**
   * Delete actual data file if it exists
   */
  private async deleteActualDataIfExists(
    caseName: string,
    loopDir: string,
    filename: string,
  ): Promise<void> {
    const actualFilename = this.getActualFilename(filename);
    const actualFilePath = this.getSnapshotPath(caseName, loopDir, actualFilename);

    if (fs.existsSync(actualFilePath)) {
      try {
        await fs.promises.unlink(actualFilePath);
        logger.info(`Deleted actual data file: ${actualFilePath}`);
      } catch (error) {
        logger.warn(`Failed to delete actual data file ${actualFilePath}: ${error}`);
      }
    }
  }

  private async verifySnapshot<T>(
    caseName: string,
    loopDir: string,
    filename: string,
    actualData: T,
    updateSnapshots: boolean,
    dataType: string,
  ): Promise<boolean> {
    const expectedData = await this.readSnapshot<T>(caseName, loopDir, filename);

    if (!expectedData) {
      if (updateSnapshots) {
        await this.writeSnapshot(caseName, loopDir, filename, actualData);
        logger.success(`✅ Created new ${dataType} snapshot for ${caseName}/${loopDir}`);
        return true;
      }
      throw new Error(`No ${dataType} snapshot found for ${caseName}/${loopDir}`);
    }

    if (updateSnapshots) {
      await this.writeSnapshot(caseName, loopDir, filename, actualData);
      logger.warn(
        `⚠️ Skipping ${dataType} verification for ${caseName}/${loopDir}, updating snapshot directly`,
      );
      return true;
    }

    const result = this.normalizer.compare(expectedData, actualData);

    if (!result.equal) {
      await this.writeActualData(caseName, loopDir, filename, actualData);
      logger.error(`❌ ${dataType} comparison failed for ${caseName}/${loopDir}:\n${result.diff}`);
      
      const actualPath = loopDir ? `${loopDir}/${this.getActualFilename(filename)}` : this.getActualFilename(filename);
      throw new Error(
        `${dataType} doesn't match for ${caseName}/${loopDir}. Actual data saved to ${actualPath}`,
      );
    }

    await this.deleteActualDataIfExists(caseName, loopDir, filename);
    logger.success(`✅ ${dataType} comparison passed for ${caseName}/${loopDir}`);
    return true;
  }

  /**
   * Clean up all .actual.jsonl files in a given snapshot directory and its subdirectories
   */
  async cleanupAllActualFiles(caseName: string): Promise<number> {
    const casePath = path.join(this.fixturesRoot, caseName);

    if (!fs.existsSync(casePath)) {
      return 0;
    }

    try {
      const findActualFiles = (dir: string): string[] => {
        const results: string[] = [];
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            results.push(...findActualFiles(fullPath));
          } else if (file.includes('.actual.jsonl')) {
            results.push(fullPath);
          }
        }

        return results;
      };

      const actualFiles = findActualFiles(casePath);

      for (const file of actualFiles) {
        try {
          await fs.promises.unlink(file);
          logger.info(`Cleanup: Deleted leftover temporary file ${file}`);
        } catch (err) {
          logger.warn(`Failed to delete temporary file ${file}: ${err}`);
        }
      }

      if (actualFiles.length > 0) {
        logger.success(
          `✅ Successfully cleaned up ${actualFiles.length} temporary .actual.jsonl files`,
        );
      }

      return actualFiles.length;
    } catch (error) {
      logger.warn(`Failed to perform cleanup of actual files: ${error}`);
      return 0;
    }
  }

  async verifyEventStreamSnapshot(
    caseName: string,
    loopDir: string,
    actualEventStream: AgentEventStream.Event[],
    updateSnapshots = false,
  ): Promise<boolean> {
    return this.verifySnapshot(
      caseName,
      loopDir,
      'event-stream.jsonl',
      actualEventStream,
      updateSnapshots,
      'Event stream',
    );
  }

  async verifyRequestSnapshot(
    caseName: string,
    loopDir: string,
    actualRequest: Record<string, unknown>,
    updateSnapshots = false,
  ): Promise<boolean> {
    const clonedRequest = JSON.parse(JSON.stringify(actualRequest));
    return this.verifySnapshot(
      caseName,
      loopDir,
      'llm-request.jsonl',
      clonedRequest,
      updateSnapshots,
      'Request',
    );
  }

  async verifyToolCallsSnapshot(
    caseName: string,
    loopDir: string,
    actualToolCalls: ToolCallData[],
    updateSnapshots = false,
  ): Promise<boolean> {
    const clonedToolCalls = JSON.parse(JSON.stringify(actualToolCalls));
    return this.verifySnapshot(
      caseName,
      loopDir,
      'tool-calls.jsonl',
      clonedToolCalls,
      updateSnapshots,
      'Tool calls',
    );
  }

  /**
   * Create a new test case directory structure
   */
  async createTestCaseStructure(caseName: string, numLoops: number): Promise<string> {
    const caseDir = path.join(this.fixturesRoot, caseName);

    if (!fs.existsSync(caseDir)) {
      await fs.promises.mkdir(caseDir, { recursive: true });
    }

    for (let i = 1; i <= numLoops; i++) {
      const loopDir = path.join(caseDir, `loop-${i}`);
      if (!fs.existsSync(loopDir)) {
        await fs.promises.mkdir(loopDir, { recursive: true });
      }
    }

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

    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }

    if (fs.existsSync(filePath) && !updateIfExists) {
      logger.info(`Skipping write to existing file: ${filePath}`);
      return;
    }

    try {
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
      const lines = content.split('\n').filter((line) => line.trim());
      if (lines.length === 0) {
        return [];
      }

      try {
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

  /**
   * Update the normalizer configuration
   */
  updateAgentNormalizerConfig(config: AgentNormalizerConfig): void {
    this.normalizer = new AgentSnapshotNormalizer(config);
  }
}