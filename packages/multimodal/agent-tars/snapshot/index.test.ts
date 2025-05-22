/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect } from 'vitest';
import { snapshotRunner } from './runner';

describe('AgentSnapshot tests', () => {
  for (const example of snapshotRunner.examples.slice(0, 1)) {
    test(`should match snapshot for ${example.name}`, async () => {
      const response = await snapshotRunner.testSnapshot(example);

      // Validate response structure
      expect(response).toBeDefined();

      // Additional assertions can be added based on the expected response structure
      if (typeof response === 'string') {
        expect(response.length).toBeGreaterThan(0);
      } else if (Array.isArray(response)) {
        expect(response.length).toBeGreaterThan(0);
      }
    });
  }
});
