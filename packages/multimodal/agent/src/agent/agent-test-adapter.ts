/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { ConsoleLogger } from '@agent-infra/logger';
import {
  AgentRunOptions,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
} from '@multimodal/agent-interface';
import { EventStream } from '../stream/event-stream';

/**
 * Testing configuration for agent snapshot generation
 */
interface TestSnapshotConfig {
  /**
   * Whether to dump test snapshots during execution
   */
  enabled: boolean;
  /**
   * Directory to dump snapshots to
   */
  outputDir: string;
  /**
   * Current test case name
   */
  testCaseName: string;
  /**
   * Current iteration/loop count
   */
  currentLoop: number;
  /**
   * Captured LLM requests
   */
  llmRequests: Record<number, LLMRequestHookPayload>;
  /**
   * Captured LLM responses
   */
  llmResponses: Record<number, LLMResponseHookPayload>;
  /**
   * Original source file that was executed
   */
  sourceFile?: string;
}

/**
 * Agent Test Adapter - handles test snapshot generation and verification
 * This class is conditionally active based on environment variables
 */
export class AgentTestAdapter {
  private testSnapshotConfig?: TestSnapshotConfig;
  private currentRunOptions?: AgentRunOptions;
  private logger: ConsoleLogger;

  constructor(
    private eventStream: EventStream,
    logger: ConsoleLogger,
  ) {
    this.logger = logger;

    // Initialize test snapshot config if enabled
    if (process.env.DUMP_AGENT_SNAPSHOP) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testCaseName =
        process.env.DUMP_AGENT_SNAPSHOP_NAME ?? `agent-run-snapshot-${timestamp}`;
      const outputDir = path.resolve(process.cwd(), 'fixtures', testCaseName);

      this.testSnapshotConfig = {
        enabled: true,
        outputDir,
        testCaseName,
        currentLoop: 0,
        llmRequests: {},
        llmResponses: {},
        sourceFile: process.env.DUMP_AGENT_SNAPSHOP_SOURCE_FILE,
      };

      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      this.logger.info(`[Test] Snapshot generation enabled. Output directory: ${outputDir}`);
    }
  }

  /**
   * Store current run options for snapshot generation
   */
  setCurrentRunOptions(options: AgentRunOptions): void {
    this.currentRunOptions = options;
  }

  /**
   * Hook called before sending a request to the LLM
   */
  onLLMRequest(id: string, payload: LLMRequestHookPayload): void {
    // If test snapshot dumping is enabled, store the request
    if (process.env.DUMP_AGENT_SNAPSHOP && this.testSnapshotConfig?.enabled) {
      this.testSnapshotConfig.currentLoop++;
      const currentLoop = this.testSnapshotConfig.currentLoop;
      this.testSnapshotConfig.llmRequests[currentLoop] = payload;

      // Create loop directory
      const loopDir = path.join(this.testSnapshotConfig.outputDir, `loop-${currentLoop}`);
      if (!fs.existsSync(loopDir)) {
        fs.mkdirSync(loopDir, { recursive: true });
      }

      // Write request to file
      fs.writeFileSync(
        path.join(loopDir, 'llm-request.jsonl'),
        JSON.stringify(payload, null, 2),
        'utf-8',
      );

      // Dump current event stream state
      const events = this.eventStream.getEvents();
      fs.writeFileSync(
        path.join(loopDir, 'event-stream.jsonl'),
        JSON.stringify(events, null, 2),
        'utf-8',
      );
    }
  }

  /**
   * Hook called after receiving a response from the LLM
   */
  onLLMResponse(id: string, payload: LLMResponseHookPayload): void {
    // Keep it empty.
  }

  /**
   * Hook called for streaming responses from the LLM
   * This method captures streaming chunks and writes them to snapshots
   */
  onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    if (process.env.DUMP_AGENT_SNAPSHOP && this.testSnapshotConfig?.enabled) {
      const currentLoop = this.testSnapshotConfig.currentLoop;
      const loopDir = `loop-${currentLoop}`;

      try {
        // Get path to save response
        const responsePath = path.join(
          this.testSnapshotConfig.outputDir,
          loopDir,
          'llm-response.jsonl',
        );

        // Write streaming chunks to file
        this.writeStreamingChunks(responsePath, payload.chunks);

        this.logger.info(`[Test] Saved ${payload.chunks.length} streaming chunks for ${loopDir}`);
      } catch (error) {
        this.logger.error(`[Test] Failed to save streaming chunks: ${error}`);
      }
    }
  }

  /**
   * Write streaming chunks to JSONL file
   */
  private writeStreamingChunks(filePath: string, chunks: any[]): void {
    // Skip if no chunks
    if (!chunks || chunks.length === 0) {
      return;
    }

    try {
      // Format each chunk as a JSON line
      const chunksAsJsonLines = chunks.map((chunk) => JSON.stringify(chunk)).join('\n');
      fs.writeFileSync(filePath, chunksAsJsonLines, 'utf-8');
      this.logger.debug(`[Test] ${chunks.length} chunks written to ${filePath}`);
    } catch (error) {
      this.logger.error(`[Test] Error writing streaming chunks: ${error}`);
    }
  }

  /**
   * Hook called at the end of the agent's execution loop
   */
  onAgentLoopEnd(id: string): void {
    // If test snapshot dumping is enabled, finalize by creating setup.ts
    if (process.env.DUMP_AGENT_SNAPSHOP && this.testSnapshotConfig?.enabled) {
      // Determine source file from which to import
      const sourceFile =
        process.env.DUMP_AGENT_SNAPSHOP_SOURCE_FILE ||
        // If not explicitly set, try to determine from the main module
        (require.main?.filename
          ? path.relative(process.cwd(), require.main.filename).replace(/\\/g, '/')
          : undefined);

      if (!sourceFile) {
        this.logger.warn(
          '[Test] Could not determine source file for test snapshot. Using mock setup file.',
        );

        // Create basic setup.ts file as fallback
        const setupFile = `import { Agent, AgentRunOptions } from '../../src';

// This is an auto-generated test setup file
// Modify this file to reproduce the agent behavior in tests

export const agent = new Agent(${JSON.stringify({}, null, 2)});

export const runOptions: AgentRunOptions = ${JSON.stringify(this.currentRunOptions)};
`;

        fs.writeFileSync(
          path.join(this.testSnapshotConfig.outputDir, 'setup.ts'),
          setupFile,
          'utf-8',
        );
      } else {
        // Create setup.ts file that imports from the original source
        const sourceFileWithoutExt = sourceFile.replace(/\.(ts|js)$/, '');
        const relPath = path
          .relative(this.testSnapshotConfig.outputDir, path.resolve(process.cwd()))
          .replace(/\\/g, '/');

        const setupFile = `import { agent, runOptions } from '${relPath ? relPath + '/' : ''}${sourceFileWithoutExt}';

export { agent, runOptions };
`;

        fs.writeFileSync(
          path.join(this.testSnapshotConfig.outputDir, 'setup.ts'),
          setupFile,
          'utf-8',
        );
      }

      // Export final event stream state to the root directory
      const finalEvents = this.eventStream.getEvents();
      fs.writeFileSync(
        path.join(this.testSnapshotConfig.outputDir, 'event-stream.jsonl'),
        JSON.stringify(finalEvents, null, 2),
        'utf-8',
      );

      this.logger.info(
        `[Test] Snapshot generation completed: ${this.testSnapshotConfig.outputDir}`,
      );
    }
  }

  /**
   * Check if test mode is enabled
   */
  isTestModeEnabled(): boolean {
    return !!this.testSnapshotConfig?.enabled;
  }
}
