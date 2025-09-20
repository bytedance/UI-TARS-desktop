/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, AgentRunOptions } from '@tarko/agent-interface';
import { AgentNormalizerConfig } from './utils/snapshot-normalizer';

/**
 * Configuration options for AgentSnapshot
 */
export interface AgentSnapshotOptions {
  /**
   * Target directory for storing/retrieving snapshots
   */
  snapshotPath: string;

  /**
   * Snapshot name (defaults to basename of snapshotPath)
   */
  snapshotName?: string;

  /**
   * Whether to update existing snapshots during tests
   * @default false
   */
  updateSnapshots?: boolean;

  /**
   * Configuration for the snapshot normalizer
   */
  normalizerConfig?: AgentNormalizerConfig;

  /**
   * Verification options for test runs
   */
  verification?: VerificationOptions;
}

/**
 * Verification options that control what gets verified during tests
 */
export interface VerificationOptions {
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
   * Number of agent loops captured
   */
  loopCount: number;

  /**
   * Final agent response
   */
  response: AgentEventStream.AssistantMessageEvent | AsyncIterable<AgentEventStream.Event>;

  /**
   * All events captured during execution
   */
  events: AgentEventStream.Event[];

  /**
   * Execution metadata
   */
  meta: {
    snapshotName: string;
    executionTime: number;
  };
}

/**
 * Result from snapshot test (renamed from SnapshotRunResult for clarity)
 */
export interface SnapshotTestResult {
  /**
   * Final agent response
   */
  response: AgentEventStream.AssistantMessageEvent | AsyncIterable<AgentEventStream.Event>;

  /**
   * All events captured during execution
   */
  events: AgentEventStream.Event[];

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
   * Whether to update existing snapshots instead of verifying
   * @default false
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
  verification?: VerificationOptions;
}

/**
 * Tool call data structure for snapshots
 */
export interface ToolCallData {
  toolCallId: string;
  name: string;
  args: unknown;
  result?: unknown;
  error?: unknown;
  executionTime?: number;
}

/**
 * Configuration for snapshot test cases
 */
export interface SnapshotCaseConfig {
  /**
   * Case name for identification
   */
  name: string;
  
  /**
   * Path to the test case module
   */
  path: string;
  
  /**
   * Directory where snapshots are stored
   */
  snapshotPath: string;
  
  /**
   * Optional vitest snapshot path
   */
  vitestSnapshotPath?: string;
}

/**
 * Test case module structure
 */
export interface SnapshotCase {
  /**
   * Agent instance to test
   */
  agent: import('@tarko/agent').Agent;
  
  /**
   * Input options for the agent run
   */
  runOptions: AgentRunOptions;
}

/**
 * Hook setup options for internal use
 */
export interface HookSetupOptions {
  updateSnapshots?: boolean;
  normalizerConfig?: AgentNormalizerConfig;
  verification?: VerificationOptions;
}

/**
 * Snapshot information
 */
export interface SnapshotInfo {
  exists: boolean;
  loopCount: number;
  path: string;
  name: string;
}

// Re-export for backward compatibility
/** @deprecated Use SnapshotTestResult instead */
export type SnapshotRunResult = SnapshotTestResult;

/** @deprecated Use SnapshotCaseConfig instead */
export type CaseConfig = SnapshotCaseConfig;
