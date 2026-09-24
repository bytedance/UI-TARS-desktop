/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Agent } from '@tarko/agent';
import { AgentRunOptions, AgentEventStream } from '@tarko/agent-interface';
import {
  AgentSnapshotOptions,
  SnapshotGenerationResult,
  SnapshotRunResult,
  TestRunConfig,
} from './types';
import { AgentNormalizerConfig } from './utils/snapshot-normalizer';
import { SnapshotManager } from './snapshot-manager';
import { AgentGenerateSnapshotHook } from './agent-generate-snapshot-hook';
import { AgentReplaySnapshotHook } from './agent-replay-snapshot-hook';
import { logger } from './utils/logger';

/**
 * Agent Snapshot - Core class for managing agent snapshots and test execution
 *
 * Provides functionality for both:
 * 1. Generating snapshots (using real LLM calls with instrumentation)
 * 2. Running tests using previously captured snapshots
 */
export class AgentSnapshot {
  private agent: Agent;
  private options: AgentSnapshotOptions;
  private snapshotPath: string;
  private snapshotName: string;
  private snapshotManager: SnapshotManager;
  private replayHook: AgentReplaySnapshotHook;
  private generateHook: AgentGenerateSnapshotHook | null = null;

  constructor(agent: Agent, options: AgentSnapshotOptions) {
    this.agent = agent;
    this.options = options;
    this.snapshotPath = options.snapshotPath || path.join(process.cwd(), 'fixtures');
    this.snapshotName = options.snapshotName ?? path.basename(this.snapshotPath);
    this.snapshotManager = new SnapshotManager(this.snapshotPath, options.normalizerConfig);
    this.replayHook = new AgentReplaySnapshotHook(agent, {
      snapshotPath: this.snapshotPath,
      snapshotName: this.snapshotName,
    });

    this.ensureSnapshotDirectory();
  }

  private ensureSnapshotDirectory(): void {
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }
  }

  private getLoopCount(): number {
    if (!fs.existsSync(this.snapshotPath)) {
      return 0;
    }

    const loopDirs = fs
      .readdirSync(this.snapshotPath)
      .filter(
        (dir) =>
          dir.startsWith('loop-') && fs.statSync(path.join(this.snapshotPath, dir)).isDirectory(),
      )
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1], 10);
        const numB = parseInt(b.split('-')[1], 10);
        return numA - numB;
      });

    return loopDirs.length;
  }

  /**
   * Generate a snapshot by executing the agent with real LLM calls
   */
  async generate(runOptions: AgentRunOptions): Promise<SnapshotGenerationResult> {
    const startTime = Date.now();

    this.generateHook = new AgentGenerateSnapshotHook(this.agent, {
      snapshotPath: this.snapshotPath,
      snapshotName: this.snapshotName,
    });

    this.ensureSnapshotDirectory();
    logger.info(`Starting snapshot generation for '${this.snapshotName}'`);

    this.generateHook.setCurrentRunOptions(runOptions);
    this.generateHook.hookAgent();

    try {
      const response = await this.agent.run(runOptions as any);

      if (this.generateHook.hasError()) {
        const error = this.generateHook.getLastError();
        logger.error(`Error occurred during snapshot generation: ${error?.message}`);
        throw error;
      }

      const events = this.agent.getEventStream().getEvents();
      const loopCount = this.getLoopCount();

      logger.success(`Successfully generated snapshot with ${loopCount} loops`);

      return {
        snapshotPath: this.snapshotPath,
        loopCount,
        response,
        events,
        meta: {
          snapshotName: this.snapshotName,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error(`Snapshot generation failed: ${error}`);
      throw error;
    } finally {
      this.generateHook?.clearError();
    }
  }

  /**
   * Run the agent using previously captured snapshots
   */
  async replay(runOptions: AgentRunOptions, config?: TestRunConfig): Promise<SnapshotRunResult> {
    const updateSnapshots = config?.updateSnapshots || this.options.updateSnapshots || false;
    const startTime = Date.now();

    if (config?.normalizerConfig) {
      this.snapshotManager.updateAgentNormalizerConfig(config.normalizerConfig);
    }

    const verification = this.buildVerificationConfig(config);

    if (!fs.existsSync(this.snapshotPath)) {
      throw new Error(
        `Snapshot directory not found: ${this.snapshotPath}. Generate snapshots first using .generate()`,
      );
    }

    const loopCount = this.getLoopCount();
    logger.info(
      `Running test against snapshot '${this.snapshotName}'${updateSnapshots ? ' (update mode)' : ''}`,
    );
    logger.info(
      `Verification settings: LLM requests: ${verification.verifyLLMRequests ? 'enabled' : 'disabled'}, ` +
        `Event streams: ${verification.verifyEventStreams ? 'enabled' : 'disabled'}, ` +
        `Tool calls: ${verification.verifyToolCalls ? 'enabled' : 'disabled'}`,
    );
    logger.info(`Found ${loopCount} loops in test case`);

    try {
      await this.replayHook.setup(this.agent, this.snapshotPath, loopCount, {
        updateSnapshots,
        normalizerConfig: config?.normalizerConfig || this.options.normalizerConfig,
        verification,
      });

      if (this.replayHook.hasError()) {
        const error = this.replayHook.getLastError();
        logger.error(`Error occurred during test setup: ${error?.message}`);
        throw error;
      }

      const mockLLMClient = this.replayHook.getMockLLMClient();
      this.agent.setCustomLLMClient(mockLLMClient!);
      this.agent._setIsReplay();

      const response = await this.agent.run(runOptions as any);

      // For streaming responses, consume the entire stream to ensure execution completes
      if (response && typeof (response as any)[Symbol.asyncIterator] === 'function') {
        // This is a streaming response, consume it fully
        try {
          let agentRunEndReceived = false;

          for await (const chunk of response as unknown as AsyncIterable<any>) {
            // Track when we receive the agent_run_end event
            if (chunk && typeof chunk === 'object' && chunk.type === 'agent_run_end') {
              agentRunEndReceived = true;
            }
            // Just consume the chunks, the actual execution happens in the background
          }

          // Ensure we received the agent_run_end event
          if (!agentRunEndReceived) {
            logger.warn('Stream completed without receiving agent_run_end event');
          }

          // Additional wait to ensure all background processing is complete
          // This ensures any final cleanup handlers are executed
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (streamError) {
          logger.error(`Error consuming stream: ${streamError}`);
          throw streamError;
        }
      }

      if (this.replayHook.hasError()) {
        const error = this.replayHook.getLastError();
        logger.error(`Error occurred during execution: ${error?.message}`);
        throw error;
      }

      const events = this.agent.getEventStream().getEvents();
      const executedLoops = this.agent.getCurrentLoopIteration();

      logger.success(`Execution completed successfully`);
      logger.info(`Executed ${executedLoops} agent loops out of ${loopCount} expected loops`);

      if (executedLoops !== loopCount) {
        throw new Error(
          `Loop count mismatch: Agent executed ${executedLoops} loops, but fixture has ${loopCount} loop directories`,
        );
      }

      if (this.snapshotManager) {
        await this.snapshotManager.cleanupAllActualFiles(this.snapshotName);
      }

      return {
        response,
        events,
        meta: {
          snapshotName: this.snapshotName,
          executionTime: Date.now() - startTime,
          loopCount: executedLoops,
        },
      };
    } catch (error) {
      logger.error(`Test execution failed: ${error}`);
      throw error;
    } finally {
      this.replayHook.clearError();
    }
  }

  private buildVerificationConfig(config?: TestRunConfig) {
    return {
      verifyLLMRequests:
        config?.verification?.verifyLLMRequests !== undefined
          ? config.verification.verifyLLMRequests
          : this.options.verification?.verifyLLMRequests !== false,
      verifyEventStreams:
        config?.verification?.verifyEventStreams !== undefined
          ? config.verification.verifyEventStreams
          : this.options.verification?.verifyEventStreams !== false,
      verifyToolCalls:
        config?.verification?.verifyToolCalls !== undefined
          ? config.verification.verifyToolCalls
          : this.options.verification?.verifyToolCalls !== false,
    };
  }

  /**
   * Get the underlying agent instance
   */
  getAgent(): Agent {
    return this.agent;
  }

  /**
   * Get the current loop number directly from Agent
   */
  getCurrentLoop(): number {
    return this.agent.getCurrentLoopIteration();
  }

  /**
   * Update the normalizer configuration
   */
  updateAgentNormalizerConfig(config: AgentNormalizerConfig): void {
    this.snapshotManager.updateAgentNormalizerConfig(config);
  }
}
