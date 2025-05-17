/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Agent } from '../agent';
import { SnapshotManager } from './snapshot-manager';
import { getLogger } from '../utils/logger';
import { Event, LLMRequestHookPayload, LLMResponseHookPayload } from '../types';
import { ChatCompletion } from '../types/third-party';

const logger = getLogger('LLMMocker');

interface LLMMockerSetupOptions {
  updateSnapshots?: boolean;
}

/**
 * LLMMocker - Mocks LLM requests and responses for agent testing
 *
 * This class intercepts LLM requests from the agent, verifies they match
 * expected requests, and returns mock responses from snapshots.
 */
export class LLMMocker {
  private agent: Agent | null = null;
  private casePath: string | null = null;
  private totalLoops = 0;
  private originalRequestHook: any = null;
  private originalResponseHook: any = null;
  private originalLoopEndHook: any = null;
  private currentLoop = 0;
  private snapshotManager: SnapshotManager | null = null;
  private updateSnapshots = false;
  private eventStreamStatesByLoop: Map<number, Event[]> = new Map();
  private finalEventStreamState: Event[] = [];

  /**
   * Store final event stream state
   */
  storeFinalEventStreamState(events: Event[]): void {
    this.finalEventStreamState = [...events];
  }

  /**
   * Get the final event stream state after agent completes
   */
  getFinalEventStreamState(): Event[] {
    return this.finalEventStreamState;
  }

  /**
   * Set up the LLM mocker with an agent and test case
   */
  setup(
    agent: Agent,
    casePath: string,
    totalLoops: number,
    options: LLMMockerSetupOptions = {},
  ): void {
    this.agent = agent;
    this.casePath = casePath;
    this.totalLoops = totalLoops;
    this.currentLoop = 0;
    this.updateSnapshots = options.updateSnapshots || false;
    this.snapshotManager = new SnapshotManager(path.dirname(casePath));

    // Store original hooks
    this.originalRequestHook = agent.onLLMRequest;
    this.originalResponseHook = agent.onLLMResponse;
    this.originalLoopEndHook = agent.onAgentLoopEnd;

    // Replace with mock hooks
    // @ts-expect-error
    agent.onLLMRequest = this.mockRequestHook.bind(this);
    // @ts-expect-error
    agent.onLLMResponse = this.mockResponseHook.bind(this);
    agent.onAgentLoopEnd = this.mockAgentLoopEndHook.bind(this);

    logger.info(`LLM mocker set up for ${path.basename(casePath)} with ${totalLoops} loops`);

    // 在设置完成后，立即验证初始事件流状态（在第一轮开始前）
    this.verifyInitialEventStreamState();
  }

  /**
   * Verify initial event stream state before the first loop
   */
  private async verifyInitialEventStreamState(): Promise<void> {
    if (!this.casePath || !this.snapshotManager || !this.agent) {
      throw new Error('LLMMocker not properly set up');
    }

    logger.info(`🔍 Verifying initial event stream state before first loop`);

    const events = this.agent.getEventStream().getEvents();
    if (events.length > 0) {
      try {
        await this.snapshotManager.verifyEventStreamSnapshot(
          path.basename(this.casePath),
          'initial',
          events,
          this.updateSnapshots,
        );
        logger.success(`✅ Initial event stream verification succeeded`);
      } catch (error) {
        logger.error(`❌ Initial event stream verification failed: ${error}`);
        if (!this.updateSnapshots) {
          throw error;
        }
      }
    }
  }

  /**
   * Restore original hooks
   */
  restore(): void {
    if (this.agent) {
      this.agent.onLLMRequest = this.originalRequestHook;
      this.agent.onLLMResponse = this.originalResponseHook;
      this.agent.onAgentLoopEnd = this.originalLoopEndHook;
      logger.info('Restored original LLM hooks');
    }
  }

  /**
   * Mock the LLM request hook to intercept and verify requests
   */
  private async mockRequestHook(
    id: string,
    payload: LLMRequestHookPayload,
  ): Promise<LLMRequestHookPayload> {
    if (!this.casePath || !this.snapshotManager) {
      throw new Error('LLMMocker not properly set up');
    }

    this.currentLoop++;
    const loopDir = `loop-${this.currentLoop}`;
    logger.info(`🔄 Intercepted LLM request for loop ${this.currentLoop}`);

    // Capture current event stream state BEFORE the LLM call
    // This ensures we're comparing at the same point in the execution flow
    if (this.agent) {
      const events = this.agent.getEventStream().getEvents();
      this.eventStreamStatesByLoop.set(this.currentLoop, [...events]);

      // Verify event stream state at this point in time
      try {
        logger.info(`🔍 Verifying event stream state at the beginning of ${loopDir}`);
        await this.snapshotManager.verifyEventStreamSnapshot(
          path.basename(this.casePath),
          loopDir,
          events,
          this.updateSnapshots,
        );
      } catch (error) {
        logger.error(`❌ Event stream verification failed for ${loopDir}: ${error}`);
        if (!this.updateSnapshots) {
          throw error;
        }
      }
    }

    // Verify request matches expected request in snapshot
    try {
      await this.snapshotManager.verifyRequestSnapshot(
        path.basename(this.casePath),
        loopDir,
        payload,
        this.updateSnapshots,
      );
    } catch (error) {
      logger.error(`❌ Request verification failed for ${loopDir}: ${error}`);
      if (!this.updateSnapshots) {
        throw error;
      }
    }

    return payload;
  }

  /**
   * Mock the LLM response hook to return mock responses from snapshots
   */
  private async mockResponseHook(
    id: string,
    payload: LLMResponseHookPayload,
  ): Promise<LLMResponseHookPayload> {
    if (!this.casePath || !this.snapshotManager) {
      throw new Error('LLMMocker not properly set up');
    }

    const loopDir = `loop-${this.currentLoop}`;

    // Load mock response from snapshot
    const mockResponse = await this.snapshotManager.readSnapshot<ChatCompletion>(
      path.basename(this.casePath),
      loopDir,
      'llm-response.jsonl',
    );

    if (!mockResponse) {
      throw new Error(`No mock response found for ${loopDir}`);
    }

    logger.success(`✅ Using mock LLM response from snapshot for ${loopDir}`);

    // Use the mock response instead of the actual one
    return {
      provider: payload.provider,
      response: mockResponse,
    };
  }

  /**
   * Mock the agent loop end hook to verify final event stream state
   */
  private async mockAgentLoopEndHook(id: string): Promise<void> {
    if (!this.casePath || !this.snapshotManager || !this.agent) {
      throw new Error('LLMMocker not properly set up');
    }

    logger.info(`🔄 Agent loop execution completed`);

    // Get the final event stream state
    const finalEvents = this.agent.getEventStream().getEvents();
    this.finalEventStreamState = [...finalEvents];

    // Verify final event stream state
    try {
      logger.info(`🔍 Verifying final event stream state after agent completion`);
      await this.snapshotManager.verifyEventStreamSnapshot(
        path.basename(this.casePath),
        '', // Root level snapshot
        finalEvents,
        this.updateSnapshots,
      );
      logger.success(`✅ Final event stream verification succeeded`);
    } catch (error) {
      logger.error(`❌ Final event stream verification failed: ${error}`);
      if (!this.updateSnapshots) {
        throw error;
      }
    }

    // Save the original hook call
    if (this.originalLoopEndHook) {
      await this.originalLoopEndHook.call(this.agent, id);
    }
  }

  /**
   * Get the event stream state after a specific loop
   */
  getEventStreamStateAfterLoop(loopNumber: number): Event[] {
    const events = this.eventStreamStatesByLoop.get(loopNumber);
    if (!events) {
      throw new Error(`No event stream state found for loop ${loopNumber}`);
    }
    return events;
  }
}
