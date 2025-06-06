/* eslint-disable @typescript-eslint/no-explicit-any */
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
  isAgentRunObjectOptions,
  AssistantMessageEvent,
} from '@multimodal/agent-interface';
import {
  AgentSnapshotOptions,
  SnapshotGenerationResult,
  SnapshotRunResult,
  TestRunConfig,
} from './types';
import { SnapshotManager } from './snapshot-manager';
import { AgentGenerateSnapshotHook } from './agent-generate-snapshot-hook';
import { AgentReplaySnapshotHook } from './agent-replay-snapshot-hook';
import { logger } from './utils/logger';
import { AgentNormalizerConfig } from './utils/snapshot-normalizer';

/**
 * Agent Snapshot - Core class for managing agent snapshots and test execution
 *
 * Provides functionality for both:
 * 1. Generating snapshots (using real LLM calls with instrumentation)
 * 2. Running tests using previously captured snapshots
 */
export class AgentSnapshot {
  private hostedAgent: Agent;
  private options: AgentSnapshotOptions;
  private snapshotPath: string;
  private snapshotName: string;
  private snapshotManager: SnapshotManager;
  private replayHook: AgentReplaySnapshotHook;
  private generateHook: AgentGenerateSnapshotHook | null = null;
  /**
   * Create a new AgentSnapshot instance
   *
   * @param agent The agent instance to snapshot/test
   * @param options Configuration options
   */
  constructor(agent: Agent, options: AgentSnapshotOptions) {
    this.hostedAgent = agent;
    this.options = options;

    this.snapshotPath = options.snapshotPath || path.join(process.cwd(), 'fixtures');
    this.snapshotName = options.snapshotName ?? path.basename(options.snapshotPath);
    this.snapshotManager = new SnapshotManager(this.snapshotPath, options.normalizerConfig);
    this.replayHook = new AgentReplaySnapshotHook(agent, {
      snapshotPath: this.options.snapshotPath || path.join(process.cwd(), 'fixtures'),
      snapshotName: this.snapshotName,
    });

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }

    process.env.TEST = 'true';

    const agentSnapshotRun = this.run.bind(this);

    // Set prototype chain to inherit from the original agent
    Object.setPrototypeOf(this, Object.getPrototypeOf(agent));

    // Copy own properties from the original agent to this instance
    Object.getOwnPropertyNames(agent).forEach((prop) => {
      if (!(prop in this)) {
        Object.defineProperty(this, prop, {
          get: () => agent[prop as keyof Agent],
          set: (value) => {
            (agent as any)[prop] = value;
          },
          configurable: true,
        });
      }
    });

    this.run = agentSnapshotRun;
  }

  /**
   * Run method with interface aligned with Agent.run
   *
   * This method serves as a transparent wrapper around the agent's run method
   * while simultaneously generating a snapshot of the interaction.
   *
   * @param input - String input for a basic text message
   * @returns The final response event from the agent (stream is false)
   */
  async run(input: string): Promise<AssistantMessageEvent>;

  /**
   * Run method with interface aligned with Agent.run
   *
   * @param options - Object with input and optional configuration
   * @returns The final response event from the agent (when stream is false)
   */
  async run(options: AgentRunObjectOptions & { stream?: false }): Promise<AssistantMessageEvent>;

  /**
   * Run method with interface aligned with Agent.run
   *
   * @param options - Object with input and streaming enabled
   * @returns An async iterable of streaming events
   */
  async run(options: AgentRunObjectOptions & { stream: true }): Promise<AsyncIterable<Event>>;

  /**
   * Implementation of the run method to handle all overload cases
   * This is a facade that matches Agent.run's interface exactly while generating snapshots
   *
   * @param runOptions - Input options
   */
  async run(runOptions: AgentRunOptions): Promise<AssistantMessageEvent | AsyncIterable<Event>> {
    logger.info(
      `AgentSnapshot.run called with ${typeof runOptions === 'string' ? 'string' : 'options object'}`,
    );

    // Initialize the snapshot generation hook if needed
    if (!this.generateHook) {
      this.generateHook = new AgentGenerateSnapshotHook(this.hostedAgent, {
        snapshotPath: this.options.snapshotPath,
        snapshotName: this.snapshotName,
      });
    }

    // Set current run options and hook into agent
    this.generateHook.setCurrentRunOptions(runOptions);
    this.generateHook.hookAgent();

    try {
      // Determine if this is a streaming request
      const isStreaming =
        typeof runOptions === 'object' &&
        isAgentRunObjectOptions(runOptions) &&
        isStreamingOptions(runOptions);

      // Run the agent with the provided options
      logger.info(`Executing agent with ${isStreaming ? 'streaming' : 'non-streaming'} mode`);
      // Call run on the original agent to ensure correct this binding
      // @ts-expect-error FIXME: remove string type.
      const response = await this.hostedAgent.run(runOptions);

      // Return the response directly to maintain the same interface as Agent.run
      return response;
    } catch (error) {
      logger.error(`Error during AgentSnapshot.run: ${error}`);
      throw error;
    } finally {
      // We don't unhook here as the response might be an AsyncIterable that's consumed later
      // The hook will be cleaned up when the agent is done processing
      if (this.generateHook) {
        this.generateHook.clearError();
      }
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
    this.generateHook = new AgentGenerateSnapshotHook(this.hostedAgent, {
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
    this.generateHook.setCurrentRunOptions(runOptions);
    this.generateHook.hookAgent();

    try {
      // Run the agent with real LLM
      // @ts-expect-error FIXME: remove string type.
      const response = await this.hostedAgent.run(runOptions);

      // Check if there was an error in any hook
      if (this.generateHook.hasError()) {
        const error = this.generateHook.getLastError();
        logger.error(`Error occurred during snapshot generation: ${error?.message}`);
        throw error;
      }

      // Get all events from event stream
      const events = this.hostedAgent.getEventStream().getEvents();

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
    } catch (error) {
      // Capture any errors from the agent or hooks
      logger.error(`Snapshot generation failed: ${error}`);
      throw error;
    } finally {
      // Since the asynchronous iterator will be consumed in the outer layer, we don't unhook here
      // But we should clear any errors to prepare for the next run
      if (this.generateHook) {
        this.generateHook.clearError();
      }
    }
  }

  /**
   * Run the agent using previously captured snapshots
   *
   * @param runOptions Options to pass to the agent's run method
   * @param config Optional test run configuration
   * @returns Test execution result
   */
  async replay(runOptions: AgentRunOptions, config?: TestRunConfig): Promise<SnapshotRunResult> {
    // Get test configuration
    const snapshotName = this.options.snapshotName || path.basename(this.options.snapshotPath);
    const updateSnapshots = config?.updateSnapshots || this.options.updateSnapshots || false;

    // If a normalizer config was provided for this run, update the snapshot manager
    if (config?.normalizerConfig) {
      this.snapshotManager.updateAgentNormalizerConfig(config.normalizerConfig);
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
      verifyToolCalls:
        config?.verification?.verifyToolCalls !== undefined
          ? config.verification.verifyToolCalls
          : this.options.verification?.verifyToolCalls !== false,
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
      `Verification settings: 
      LLM requests: ${verification.verifyLLMRequests ? 'enabled' : 'disabled'}, 
      Event streams: ${verification.verifyEventStreams ? 'enabled' : 'disabled'},
      Tool calls: ${verification.verifyToolCalls ? 'enabled' : 'disabled'}`,
    );

    // Count loop directories to know how many iterations to expect
    const loopCount = this.countLoops(this.snapshotPath);
    logger.info(`Found ${loopCount} loops in test case`);

    const startTime = Date.now();

    try {
      // Set up mocking with a reference to this instance for loop tracking
      await this.replayHook.setup(this.hostedAgent, this.snapshotPath, loopCount, {
        updateSnapshots,
        // Pass the normalizer config to the mocker
        normalizerConfig: config?.normalizerConfig || this.options.normalizerConfig,
        // Pass verification settings
        verification,
      });

      // Check for errors during setup
      if (this.replayHook.hasError()) {
        const error = this.replayHook.getLastError();
        logger.error(`Error occurred during test setup: ${error?.message}`);
        throw error;
      }

      // Get the mock LLM client
      const mockLLMClient = this.replayHook.getMockLLMClient();

      this.hostedAgent.setCustomLLMClient(mockLLMClient!);
      // Create a new agent instance with the mock LLM client

      // Run the agent using mocked LLM
      const isStreaming =
        typeof runOptions === 'object' && isStreamingOptions(runOptions as AgentRunObjectOptions);
      let response;
      let events: Event[] = [];

      // Set the `isReplay` flag to tell the agent that is replay mode.
      this.hostedAgent._setIsReplay();

      if (isStreaming) {
        // Handle streaming mode
        // @ts-expect-error FIXME: remove string type.
        const asyncIterable = await this.hostedAgent.run(runOptions);
        const streamEvents = [];

        // Consume all events from the stream
        logger.info(`Processing streaming response...`);
        for await (const event of asyncIterable as AsyncIterable<Event>) {
          // Check for errors between stream events
          if (this.replayHook.hasError()) {
            const error = this.replayHook.getLastError();
            logger.error(`Error occurred during streaming: ${error?.message}`);
            throw error;
          }
          streamEvents.push(event);
        }

        response = asyncIterable;
        // Get final events from event stream
        events = this.hostedAgent.getEventStream().getEvents();

        logger.success(`Streaming execution completed with ${streamEvents.length} events`);
      } else {
        // Handle non-streaming mode
        // @ts-expect-error FIXME: remove string type.
        response = await this.hostedAgent.run(runOptions);

        // Check for errors after run
        if (this.replayHook.hasError()) {
          const error = this.replayHook.getLastError();
          logger.error(`Error occurred during execution: ${error?.message}`);
          throw error;
        }

        // Get final events from event stream
        events = this.hostedAgent.getEventStream().getEvents();

        logger.success(`Execution completed successfully`);
      }

      // Verify execution metrics
      const executedLoops = this.hostedAgent.getCurrentLoopIteration();
      logger.info(`Executed ${executedLoops} agent loops out of ${loopCount} expected loops`);

      if (executedLoops !== loopCount) {
        throw new Error(
          `Loop count mismatch: Agent executed ${executedLoops} loops, but fixture has ${loopCount} loop directories`,
        );
      }

      // Final cleanup of any leftover actual files - call the unified method
      if (this.snapshotManager) {
        await this.snapshotManager.cleanupAllActualFiles(this.snapshotName);
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
    } catch (error) {
      // Propagate any errors from the run or hooks
      logger.error(`Test execution failed: ${error}`);
      throw error;
    } finally {
      // Clear any errors to prepare for the next run
      this.replayHook.clearError();
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
    return this.hostedAgent;
  }

  /**
   * Get the current loop number directly from Agent
   */
  getCurrentLoop(): number {
    return this.hostedAgent.getCurrentLoopIteration();
  }

  /**
   * Update the normalizer configuration
   *
   * @param config New normalizer configuration
   */
  updateAgentNormalizerConfig(config: AgentNormalizerConfig): void {
    this.snapshotManager.updateAgentNormalizerConfig(config);
  }
}
