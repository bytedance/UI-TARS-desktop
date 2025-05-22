/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Agent } from '@multimodal/agent';
import {
  AgentRunOptions,
  AgentRunObjectOptions,
  Event,
  isStreamingOptions,
} from '@multimodal/agent-interface';
import {
  AgentSnapshotOptions,
  SnapshotGenerationResult,
  SnapshotRunResult,
  TestRunConfig,
} from './types';
import { SnapshotManager } from './snapshot-manager';
import { LLMMocker } from './llm-mocker';
import { logger } from './utils/logger';
import { AgentHookManager } from './agent-hook-manager';
import { NormalizerConfig } from './utils/snapshot-normalizer';

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
  private llmMocker: LLMMocker;
  private hookManager: AgentHookManager | null = null;

  /**
   * Create a new AgentSnapshot instance
   *
   * @param agent The agent instance to snapshot/test
   * @param options Configuration options
   */
  constructor(agent: Agent, options: AgentSnapshotOptions) {
    this.agent = agent;
    this.options = options;

    this.snapshotPath = options.snapshotPath || path.join(process.cwd(), 'fixtures');
    this.snapshotName = options.snapshotName ?? path.basename(options.snapshotPath);
    this.snapshotManager = new SnapshotManager(this.snapshotPath, options.normalizerConfig);
    this.llmMocker = new LLMMocker(this.agent, {
      snapshotPath: this.snapshotPath,
      snapshotName: this.snapshotName,
    });

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }
  }

  /**
   * Generate a snapshot by executing the agent with real LLM calls
   *
   * @param runOptions Options to pass to the agent's run method
   * @returns Snapshot generation result
   */
  async generate(runOptions: AgentRunOptions): Promise<SnapshotGenerationResult> {
    // Create unique test name if not provided
    const snapshotName = this.snapshotName || `agent-snapshot-${Date.now()}`;

    // Initialize hook manager
    this.hookManager = new AgentHookManager(this.agent, {
      snapshotPath: this.options.snapshotPath || path.join(process.cwd(), 'fixtures'),
      snapshotName: snapshotName,
    });

    if (this.snapshotPath) {
      if (!fs.existsSync(this.snapshotPath)) {
        fs.mkdirSync(this.snapshotPath, { recursive: true });
      }
    }

    logger.info(`Starting snapshot generation for '${snapshotName}'`);
    const startTime = Date.now();

    // Set current run options and hook into agent
    this.hookManager.setCurrentRunOptions(runOptions);
    this.hookManager.hookAgent();

    try {
      // Run the agent with real LLM
      // @ts-expect-error
      const response = await this.agent.run(runOptions);

      // Get all events from event stream
      const events = this.agent.getEventStream().getEvents();

      // Count the number of loops by checking directories created
      const snapshotPath = path.join(this.options.snapshotPath);
      const loopCount = this.countLoops(snapshotPath);

      logger.success(`Successfully generated snapshot with ${loopCount} loops`);

      return {
        snapshotPath,
        loopCount,
        response,
        events,
        meta: {
          snapshotName: this.snapshotName,
          executionTime: Date.now() - startTime,
        },
      };
    } finally {
      // Since the asynchronous iterator will be consumed in the outer layer, unHook cannot be used here.
      // if (this.hookManager) {
      //   this.hookManager.unhookAgent();
      // }
    }
  }

  /**
   * Run the agent using previously captured snapshots
   *
   * @param runOptions Options to pass to the agent's run method
   * @param config Optional test run configuration
   * @returns Test execution result
   */
  async run(runOptions: AgentRunOptions, config?: TestRunConfig): Promise<SnapshotRunResult> {
    // Get test configuration
    const snapshotName = this.options.snapshotName || path.basename(this.options.snapshotPath);
    const updateSnapshots = config?.updateSnapshots || this.options.updateSnapshots || false;

    // If a normalizer config was provided for this run, update the snapshot manager
    if (config?.normalizerConfig) {
      this.snapshotManager.updateNormalizerConfig(config.normalizerConfig);
    }

    // Merge verification settings from options and run config
    const verification = {
      verifyLLMRequests:
        config?.verification?.verifyLLMRequests !== undefined
          ? config.verification.verifyLLMRequests
          : this.options.verification?.verifyLLMRequests !== false,
      verifyEventStreams:
        config?.verification?.verifyEventStreams !== undefined
          ? config.verification.verifyEventStreams
          : this.options.verification?.verifyEventStreams !== false,
    };

    // Verify snapshot exists
    if (!fs.existsSync(this.snapshotPath)) {
      throw new Error(
        `Snapshot directory not found: ${this.snapshotPath}. Generate snapshots first using .generate()`,
      );
    }

    logger.info(
      `Running test against snapshot '${snapshotName}'${updateSnapshots ? ' (update mode)' : ''}`,
    );
    logger.info(
      `Verification settings: LLM requests: ${verification.verifyLLMRequests ? 'enabled' : 'disabled'}, Event streams: ${verification.verifyEventStreams ? 'enabled' : 'disabled'}`,
    );

    // Count loop directories to know how many iterations to expect
    const loopCount = this.countLoops(this.snapshotPath);
    logger.info(`Found ${loopCount} loops in test case`);

    const startTime = Date.now();

    try {
      // Set up mocking with a reference to this instance for loop tracking
      this.llmMocker.setup(this.agent, this.snapshotPath, loopCount, {
        updateSnapshots,
        // Pass the normalizer config to the mocker
        normalizerConfig: config?.normalizerConfig || this.options.normalizerConfig,
        // Pass verification settings
        verification,
      });

      // Get the mock LLM client
      const mockLLMClient = this.llmMocker.getMockLLMClient();

      this.agent.setCustomLLMClient(mockLLMClient!);
      // Create a new agent instance with the mock LLM client

      // Run the agent using mocked LLM
      const isStreaming =
        typeof runOptions === 'object' && isStreamingOptions(runOptions as AgentRunObjectOptions);
      let response;
      let events: Event[] = [];

      if (isStreaming) {
        // Handle streaming mode
        // @ts-expect-error
        const asyncIterable = await this.agent.run(runOptions);
        const streamEvents = [];

        // Consume all events from the stream
        logger.info(`Processing streaming response...`);
        for await (const event of asyncIterable as AsyncIterable<Event>) {
          streamEvents.push(event);
        }

        response = asyncIterable;
        // Get final events from event stream
        events = this.agent.getEventStream().getEvents();

        logger.success(`Streaming execution completed with ${streamEvents.length} events`);
      } else {
        // Handle non-streaming mode
        // @ts-expect-error
        response = await this.agent.run(runOptions);
        // Get final events from event stream
        events = this.agent.getEventStream().getEvents();

        logger.success(`Execution completed successfully`);
      }

      // Verify execution metrics
      const executedLoops = this.agent.getCurrentLoopIteration();
      logger.info(`Executed ${executedLoops} agent loops out of ${loopCount} expected loops`);

      if (executedLoops !== loopCount) {
        throw new Error(
          `Loop count mismatch: Agent executed ${executedLoops} loops, but fixture has ${loopCount} loop directories`,
        );
      }

      return {
        response,
        events,
        meta: {
          snapshotName,
          executionTime: Date.now() - startTime,
          loopCount: executedLoops,
        },
      };
    } finally {
      // Since the asynchronous iterator will be consumed in the outer layer, unHook cannot be used here.
      // this.llmMocker.restore();
    }
  }

  /**
   * Count the number of loop directories in the snapshot
   */
  private countLoops(casePath: string): number {
    if (!fs.existsSync(casePath)) {
      return 0;
    }

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

    return loopDirs.length;
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
   *
   * @param config New normalizer configuration
   */
  updateNormalizerConfig(config: NormalizerConfig): void {
    this.snapshotManager.updateNormalizerConfig(config);
  }
}
