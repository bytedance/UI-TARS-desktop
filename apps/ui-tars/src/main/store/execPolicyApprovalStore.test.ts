/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, describe, expect, it } from 'vitest';

import { ExecPolicyApprovalStore } from './execPolicyApprovalStore';

describe('ExecPolicyApprovalStore', () => {
  afterEach(() => {
    ExecPolicyApprovalStore.getInstance().resetForTests();
  });

  it('stores approval schema with issuer scope expiry timestamp', () => {
    const store = ExecPolicyApprovalStore.getInstance();
    const timestamp = 1_700_000_000_000;
    const approval = store.grantApproval({
      issuer: 'reviewer@security',
      scope: 'legacy.action.click',
      expiresAt: timestamp + 60_000,
      timestamp,
    });

    expect(approval.issuer).toBe('reviewer@security');
    expect(approval.scope).toBe('legacy.action.click');
    expect(approval.expiresAt).toBe(timestamp + 60_000);
    expect(approval.timestamp).toBe(timestamp);
  });

  it('unexpired approval allows scoped execution and writes audit row', () => {
    const store = ExecPolicyApprovalStore.getInstance();
    const timestamp = 1_700_000_100_000;
    store.grantApproval({
      issuer: 'reviewer@security',
      scope: 'legacy.action.*',
      expiresAt: timestamp + 120_000,
      timestamp,
    });

    const decision = store.evaluate({
      operation: 'legacy.action.click',
      timestamp: timestamp + 1_000,
    });

    expect(decision.decision).toBe('allow');
    expect(decision.reason).toBe('approval_valid');

    const audit = store.queryAudit({ decision: 'allow' });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toEqual(
      expect.objectContaining({
        operation: 'legacy.action.click',
        decision: 'allow',
        reason: 'approval_valid',
      }),
    );
  });

  it('approval_expired denies deterministically and records deny audit', () => {
    const store = ExecPolicyApprovalStore.getInstance();
    const timestamp = 1_700_000_200_000;
    store.grantApproval({
      issuer: 'reviewer@security',
      scope: 'legacy.action.click',
      expiresAt: timestamp + 1_000,
      timestamp,
    });

    const decision = store.evaluate({
      operation: 'legacy.action.click',
      timestamp: timestamp + 2_000,
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reason).toBe('approval_expired');

    const audit = store.queryAudit({ reason: 'approval_expired' });
    expect(audit).toHaveLength(1);
    expect(audit[0].decision).toBe('deny');
  });

  it('returns approval and denial records from audit query', () => {
    const store = ExecPolicyApprovalStore.getInstance();
    const timestamp = 1_700_000_300_000;
    store.grantApproval({
      issuer: 'reviewer@security',
      scope: 'legacy.action.click',
      expiresAt: timestamp + 30_000,
      timestamp,
    });

    store.evaluate({
      operation: 'legacy.action.click',
      timestamp: timestamp + 1_000,
    });
    store.evaluate({
      operation: 'legacy.action.type',
      timestamp: timestamp + 1_000,
    });

    const audit = store.queryAudit();
    expect(audit.some((entry) => entry.decision === 'allow')).toBe(true);
    expect(audit.some((entry) => entry.decision === 'deny')).toBe(true);
  });
});
