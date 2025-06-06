/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentSnapshotRunner } from '@multimodal/agent-snapshot';
import { resolve } from 'path';
import { CaseConfig } from '@multimodal/agent-snapshot';

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
export const examples: CaseConfig[] = [createCaseConfig('research/nvidia-stock')];

export const snapshotRunner = new AgentSnapshotRunner(examples);

if (require.main === module) {
  snapshotRunner.cli();
}
