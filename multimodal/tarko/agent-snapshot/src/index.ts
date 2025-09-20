/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// Main API
export { AgentSnapshot } from './agent-snapshot';
export { AgentSnapshotRunner } from './agent-snapshot-runner';
export { SnapshotManager } from './snapshot-manager';

// Types
export type {
  AgentSnapshotOptions,
  VerificationOptions,
  SnapshotGenerationResult,
  SnapshotTestResult,
  TestRunConfig,
  ToolCallData,
  SnapshotCaseConfig,
  SnapshotCase,
  SnapshotInfo,
  // Backward compatibility
  SnapshotRunResult,
  CaseConfig,
} from './types';

// Utilities
export { AgentSnapshotNormalizer } from './utils/snapshot-normalizer';
export type { AgentNormalizerConfig, ComparisonResult } from './utils/snapshot-normalizer';
export { logger } from './utils/logger';

// Advanced/Internal API (for extension)
export { AgentHookBase } from './agent-hook-base';
export type { HookOptions } from './agent-hook-base';
export { AgentGenerateSnapshotHook } from './agent-generate-snapshot-hook';
export { AgentReplaySnapshotHook } from './agent-replay-snapshot-hook';
