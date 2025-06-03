/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect } from 'vitest';
// We do not directly depend on @multimodal/agent-snapshot to avoid circular dependencies.
import { AgentSnapshot, AgentSnapshotNormalizer } from '../../agent-snapshot';
import { resolve } from 'path';
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

  test('should fail with non-existent snapshot', async () => {
    const { agent, runOptions } = await import('../examples/tool-calls/basic');

    // @ts-expect-error AgentSnapshot constructor signature needs update
    const agentSnapshot = new AgentSnapshot(agent, {
      snapshotPath: resolve(__dirname, '../fixtures/non-existent'),
    });

    // This should throw an error because the snapshot doesn't exist
    await expect(agentSnapshot.replay(runOptions)).rejects.toThrow();
  });
});
