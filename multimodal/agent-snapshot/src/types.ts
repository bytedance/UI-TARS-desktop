/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, AssistantMessageEvent } from '@multimodal/agent-interface';
import { AgentSnapshotNormalizer, AgentNormalizerConfig } from './utils/snapshot-normalizer';

/**
 * Configuration options for AgentSnapshot
 */
export interface AgentSnapshotOptions {
  /**
   * Target directory for storing/retrieving snapshots
   */
  snapshotPath: string;

  /**
   * Snapshot name
   */
  snapshotName?: string;

  /**
   * Whether to update existing snapshots
   */
  updateSnapshots?: boolean;

  /**
   * Test name to use for the snapshots
   */
  testName?: string;

  /**
   * Configuration for the snapshot normalizer
   */
  normalizerConfig?: AgentNormalizerConfig;

  /**
   * Verification options for test runs
   */
  verification?: {
    /**
     * Whether to verify LLM requests against snapshots
     * @default true
     */
    verifyLLMRequests?: boolean;

    /**
     * Whether to verify event stream states against snapshots
     * @default true
     */
    verifyEventStreams?: boolean;

    /**
     * Whether to verify tool calls against snapshots
     * @default true
     */
    verifyToolCalls?: boolean;
  };
}

/**
 * Result from snapshot generation
 */
export interface SnapshotGenerationResult {
  /**
   * Path where snapshots were saved
   */
  snapshotPath: string;

  /**
   * Number of iterations/loops captured
   */
  loopCount: number;

  /**
   * Final agent response
   */
  response: AssistantMessageEvent | AsyncIterable<Event>;

  /**
   * All events captured during execution
   */
  events: Event[];

  /**
   * Execution metadata
   */
  meta: {
    snapshotName: string;
    executionTime: number;
  };
}

/**
 * Result from snapshot playback/test
 */
export interface SnapshotRunResult {
  /**
   * Final agent response
   */
  response: AssistantMessageEvent | AsyncIterable<Event>;

  /**
   * All events captured during execution
   */
  events: Event[];

  /**
   * Execution metadata
   */
  meta: {
    snapshotName: string;
    executionTime: number;
    loopCount: number;
  };
}

/**
 * Configuration for an individual test run
 */
export interface TestRunConfig {
  /**
   * Whether to update existing snapshots
   */
  updateSnapshots?: boolean;

  /**
   * Maximum execution time in milliseconds
   */
  timeout?: number;

  /**
   * Configuration for the snapshot normalizer for this run
   */
  normalizerConfig?: AgentNormalizerConfig;

  /**
   * Verification options for this particular test run
   */
  verification?: {
    /**
     * Whether to verify LLM requests against snapshots
     */
    verifyLLMRequests?: boolean;

    /**
     * Whether to verify event stream states against snapshots
     */
    verifyEventStreams?: boolean;

    /**
     * Whether to verify tool calls against snapshots
     */
    verifyToolCalls?: boolean;
  };
}
