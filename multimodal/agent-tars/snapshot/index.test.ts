/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';
import { AgentSnapshotNormalizer } from '@multimodal/agent-snapshot';
import { snapshotRunner } from './runner';

const normalizer = new AgentSnapshotNormalizer({});
expect.addSnapshotSerializer(normalizer.createSnapshotSerializer());

describe.skip('AgentSnapshot tests', () => {
  for (const example of snapshotRunner.examples) {
    test(`should match snapshot for ${example.name}`, async () => {
      const response = await snapshotRunner.replaySnapshot(example);
      // Validate response structure
      expect(response.meta).matchSnapshot();
      expect(response.events).matchSnapshot();
      expect(response.response).matchSnapshot();
    });
  }
});
