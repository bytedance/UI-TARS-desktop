/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// We do not directly depend on @multimodal/agent-snapshot to avoid circular dependencies.
import { AgentSnapshotRunner, CaseConfig } from '../../agent-snapshot';
import { resolve } from 'path';

// Base paths for better maintainability
const ROOT_DIR = resolve(__dirname, '..');
const EXAMPLES_DIR = resolve(ROOT_DIR, 'examples');
const FIXTURES_DIR = resolve(ROOT_DIR, 'snapshot');
const SNAPSHOTS_DIR = resolve(ROOT_DIR, '__snapshots__');

/**
 * Creates a full case configuration from just a name/path
 */
function createCaseConfig(name: string): CaseConfig {
  const [category, subPath] = name.split('/');
  const basePath = `${category}/${subPath}`;

  return {
    name,
    path: `${resolve(EXAMPLES_DIR, basePath)}.ts`,
    snapshotPath: resolve(FIXTURES_DIR, basePath),
    vitestSnapshotPath: resolve(SNAPSHOTS_DIR, basePath),
  };
}

// Central configuration for all example snapshots
export const examples: CaseConfig[] = [
  createCaseConfig('tool-calls/basic'),
  createCaseConfig('tool-calls/prompt-engineering-impl'),
  createCaseConfig('tool-calls/structured-outputs-impl'),
  createCaseConfig('streaming/tool-calls'),
  createCaseConfig('streaming/tool-calls-prompt-engineering-impl'),
  createCaseConfig('streaming/tool-calls-structured-outputs-impl'),
  createCaseConfig('gui-agent/basic'),
  createCaseConfig('planner/basic'),
];

export const snapshotRunner = new AgentSnapshotRunner(examples);

if (require.main === module) {
  snapshotRunner.cli();
}
