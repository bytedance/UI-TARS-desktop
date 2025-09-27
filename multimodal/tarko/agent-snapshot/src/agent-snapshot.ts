/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Agent } from '@tarko/agent';
import {
  AgentRunOptions,
  AgentEventStream,
} from '@tarko/agent-interface';
import {
  AgentSnapshotOptions,
  SnapshotGenerationResult,
  SnapshotTestResult,
  TestRunConfig,
} from './types';
import { SnapshotManager } from './snapshot-manager';
import { AgentGenerateSnapshotHook } from './agent-generate-snapshot-hook';
import { AgentReplaySnapshotHook } from './agent-replay-snapshot-hook';
import { logger } from './utils/logger';
import { AgentNormalizerConfig } from './utils/snapshot-normalizer';

/**
 * AgentSnapshot - Snapshot-based testing for @tarko/agent
 * 
 * Provides a clean API for generating and testing agent snapshots without
 * complex inheritance or prototype manipulation.
 */
export class AgentSnapshot {
  private readonly agent: Agent;
  private readonly options: AgentSnapshotOptions;
  private readonly snapshotPath: string;
  private readonly snapshotName: string;
  private readonly snapshotManager: SnapshotManager;

  constructor(agent: Agent, options: AgentSnapshotOptions) {
    this.agent = agent;
    this.options = { ...options };
    
    this.snapshotPath = path.resolve(options.snapshotPath);
    this.snapshotName = options.snapshotName ?? path.basename(this.snapshotPath);
    this.snapshotManager = new SnapshotManager(this.snapshotPath, options.normalizerConfig);

    this.ensureSnapshotDirectory();
  }

  /**
   * Generate a new snapshot by running the agent with real LLM calls
   */
  async generate(input: AgentRunOptions): Promise<SnapshotGenerationResult> {
    logger.info(`Generating snapshot: ${this.snapshotName}`);
    const startTime = Date.now();

    const hook = new AgentGenerateSnapshotHook(this.agent, {
      snapshotPath: this.snapshotPath,
      snapshotName: this.snapshotName,
    });

    try {
      hook.hookAgent();
      
      const response = await this.agent.run(input as any);
      
      if (hook.hasError()) {
        throw hook.getLastError()!;
      }

      const events = this.agent.getEventStream().getEvents();
      const loopCount = this.countLoops();

      logger.success(`Snapshot generated successfully with ${loopCount} loops`);

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
      hook.unhookAgent();
    }
  }

  /**
   * Test the agent against an existing snapshot
   */
  async test(input: AgentRunOptions, config?: TestRunConfig): Promise<SnapshotTestResult> {
    logger.info(`Testing against snapshot: ${this.snapshotName}`);
    
    if (!this.snapshotExists()) {
      throw new Error(
        `Snapshot not found at ${this.snapshotPath}. Generate it first using .generate()`
      );
    }

    const startTime = Date.now();
    const updateSnapshots = config?.updateSnapshots ?? this.options.updateSnapshots ?? false;
    const verification = this.mergeVerificationSettings(config?.verification);
    
    if (updateSnapshots) {
      logger.warn('Update mode enabled - snapshots will be updated instead of verified');
    }

    const loopCount = this.countLoops();
    logger.info(`Found ${loopCount} loops in snapshot`);

    const hook = new AgentReplaySnapshotHook(this.agent, {
      snapshotPath: this.snapshotPath,
      snapshotName: this.snapshotName,
    });

    try {
      await hook.setup(this.agent, this.snapshotPath, loopCount, {
        updateSnapshots,
        normalizerConfig: config?.normalizerConfig ?? this.options.normalizerConfig,
        verification,
      });

      if (hook.hasError()) {
        throw hook.getLastError()!;
      }

      // Set mock LLM client and replay mode
      const mockLLMClient = hook.getMockLLMClient();
      this.agent.setCustomLLMClient(mockLLMClient!);
      this.agent._setIsReplay();

      const response = await this.agent.run(input as any);
      
      if (hook.hasError()) {
        throw hook.getLastError()!;
      }

      const events = this.agent.getEventStream().getEvents();
      const executedLoops = this.agent.getCurrentLoopIteration();

      // Verify loop count consistency
      if (executedLoops !== loopCount) {
        throw new Error(
          `Loop count mismatch: executed ${executedLoops} but snapshot has ${loopCount} loops`
        );
      }

      // Cleanup temporary files
      await this.snapshotManager.cleanupAllActualFiles(this.snapshotName);

      logger.success(`Test completed successfully`);

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
      logger.error(`Test failed: ${error}`);
      throw error;
    } finally {
      hook.unhookAgent();
    }
  }

  /**
   * Update the normalizer configuration
   */
  updateNormalizerConfig(config: AgentNormalizerConfig): void {
    this.snapshotManager.updateAgentNormalizerConfig(config);
  }

  /**
   * Get the underlying agent instance
   */
  getAgent(): Agent {
    return this.agent;
  }

  /**
   * Check if snapshot exists
   */
  snapshotExists(): boolean {
    return fs.existsSync(this.snapshotPath) && this.countLoops() > 0;
  }

  /**
   * Get snapshot information
   */
  getSnapshotInfo(): { exists: boolean; loopCount: number; path: string } {
    return {
      exists: this.snapshotExists(),
      loopCount: this.countLoops(),
      path: this.snapshotPath,
    };
  }

  private ensureSnapshotDirectory(): void {
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }
  }

  private countLoops(): number {
    if (!fs.existsSync(this.snapshotPath)) {
      return 0;
    }

    const loopDirs = fs
      .readdirSync(this.snapshotPath)
      .filter(
        (dir) => 
          dir.startsWith('loop-') && 
          fs.statSync(path.join(this.snapshotPath, dir)).isDirectory()
      )
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1], 10);
        const numB = parseInt(b.split('-')[1], 10);
        return numA - numB;
      });

    return loopDirs.length;
  }

  private mergeVerificationSettings(configVerification?: TestRunConfig['verification']) {
    return {
      verifyLLMRequests: 
        configVerification?.verifyLLMRequests ?? 
        this.options.verification?.verifyLLMRequests ?? 
        true,
      verifyEventStreams: 
        configVerification?.verifyEventStreams ?? 
        this.options.verification?.verifyEventStreams ?? 
        true,
      verifyToolCalls: 
        configVerification?.verifyToolCalls ?? 
        this.options.verification?.verifyToolCalls ?? 
        true,
    };
  }
}
