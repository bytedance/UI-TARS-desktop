/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import {
  INVOKE_GATE_DENY_REASON_CATALOG,
  INVOKE_GATE_DENY_REASONS,
} from './invokeGateReasons';

describe('invokeGate deny reason catalog', () => {
  it('contains exactly one catalog entry per deny reason', () => {
    const reasonList = [...INVOKE_GATE_DENY_REASONS].sort();
    const catalogKeys = Object.keys(INVOKE_GATE_DENY_REASON_CATALOG).sort();

    expect(catalogKeys).toEqual(reasonList);
  });

  it('defines non-empty message and guidance for each reason', () => {
    for (const reason of INVOKE_GATE_DENY_REASONS) {
      const metadata = INVOKE_GATE_DENY_REASON_CATALOG[reason];
      expect(metadata.message.trim().length).toBeGreaterThan(0);
      expect(metadata.guidance.trim().length).toBeGreaterThan(0);
      expect(['info', 'warning', 'error']).toContain(metadata.severity);
    }
  });
});
