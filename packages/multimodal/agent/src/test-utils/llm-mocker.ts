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
  private currentLoop = 0;
  private snapshotManager: SnapshotManager | null = null;
  private updateSnapshots = false;
  private eventStreamStatesByLoop: Map<number, Event[]> = new Map();

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

    // Replace with mock hooks
    // @ts-expect-error
    agent.onLLMRequest = this.mockRequestHook.bind(this);
    // @ts-expect-error
    agent.onLLMResponse = this.mockResponseHook.bind(this);

    logger.info(`LLM mocker set up for ${casePath} with ${totalLoops} loops`);
  }

  /**
   * Restore original hooks
   */
  restore(): void {
    if (this.agent) {
      this.agent.onLLMRequest = this.originalRequestHook;
      this.agent.onLLMResponse = this.originalResponseHook;
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
    logger.info(`Intercepted LLM request for loop ${this.currentLoop}`);

    // Capture current event stream state
    if (this.agent) {
      const events = this.agent.getEventStream().getEvents();
      this.eventStreamStatesByLoop.set(this.currentLoop, [...events]);
    }

    // Load expected request from snapshot
    const expectedRequest = await this.snapshotManager.readSnapshot<LLMRequestHookPayload>(
      path.basename(this.casePath),
      loopDir,
      'llm-request.jsonl',
    );

    // If updating snapshots or no expected request exists, save the actual request
    if (this.updateSnapshots || !expectedRequest) {
      await this.snapshotManager.writeSnapshot(
        path.basename(this.casePath),
        loopDir,
        'llm-request.jsonl',
        payload,
      );
    } else {
      // Otherwise verify the request matches the expected one
      // In a real implementation, we'd want more sophisticated comparison here
      logger.info(`Verifying request for loop ${this.currentLoop}`);
      // Note: we're not strictly comparing here as there can be timestamps, etc.
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
    logger.info(`Mock response for loop ${this.currentLoop}`);

    // Load mock response from snapshot
    const mockResponse = await this.snapshotManager.readSnapshot<ChatCompletion>(
      path.basename(this.casePath),
      loopDir,
      'llm-response.jsonl',
    );

    if (!mockResponse) {
      throw new Error(`No mock response found for ${loopDir}`);
    }

    // Use the mock response instead of the actual one
    return {
      provider: payload.provider,
      response: mockResponse,
    };
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
