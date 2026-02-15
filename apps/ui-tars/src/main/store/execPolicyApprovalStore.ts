/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'crypto';

import { z } from 'zod';

export const EXEC_POLICY_APPROVAL_REASONS = [
  'approval_valid',
  'approval_missing',
  'approval_expired',
] as const;

export type ExecPolicyApprovalReason =
  (typeof EXEC_POLICY_APPROVAL_REASONS)[number];

export type ExecPolicyApprovalDecision = 'allow' | 'deny';

const ExecPolicyApprovalRecordSchema = z.object({
  approvalId: z.string().min(1),
  issuer: z.string().min(1),
  scope: z.string().min(1),
  expiresAt: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(),
});

const ExecPolicyApprovalAuditRecordSchema = z.object({
  auditId: z.string().min(1),
  operation: z.string().min(1),
  decision: z.enum(['allow', 'deny']),
  reason: z.enum(EXEC_POLICY_APPROVAL_REASONS),
  timestamp: z.number().int().nonnegative(),
  approvalId: z.string().min(1).optional(),
  issuer: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  expiresAt: z.number().int().nonnegative().optional(),
});

const globToRegExp = (pattern: string): RegExp => {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`);
};

const matchesScope = (scope: string, operation: string): boolean => {
  try {
    return globToRegExp(scope).test(operation);
  } catch {
    return false;
  }
};

export type ExecPolicyApprovalRecord = z.infer<
  typeof ExecPolicyApprovalRecordSchema
>;
export type ExecPolicyApprovalAuditRecord = z.infer<
  typeof ExecPolicyApprovalAuditRecordSchema
>;

export class ExecPolicyApprovalStore {
  private static instance: ExecPolicyApprovalStore;

  private readonly approvals: ExecPolicyApprovalRecord[] = [];
  private readonly audits: ExecPolicyApprovalAuditRecord[] = [];

  private constructor() {}

  public static getInstance(): ExecPolicyApprovalStore {
    if (!ExecPolicyApprovalStore.instance) {
      ExecPolicyApprovalStore.instance = new ExecPolicyApprovalStore();
    }

    return ExecPolicyApprovalStore.instance;
  }

  public grantApproval(params: {
    issuer: string;
    scope: string;
    expiresAt: number;
    timestamp?: number;
  }): ExecPolicyApprovalRecord {
    const timestamp = params.timestamp ?? Date.now();
    const parsed = ExecPolicyApprovalRecordSchema.safeParse({
      approvalId: randomUUID(),
      issuer: params.issuer,
      scope: params.scope,
      expiresAt: params.expiresAt,
      timestamp,
    });

    if (!parsed.success) {
      throw new Error('[EXEC_POLICY_APPROVAL_INVALID]');
    }

    if (parsed.data.expiresAt <= parsed.data.timestamp) {
      throw new Error('[EXEC_POLICY_APPROVAL_INVALID_EXPIRY]');
    }

    this.approvals.push(parsed.data);
    return parsed.data;
  }

  public evaluate(params: { operation: string; timestamp?: number }): {
    decision: ExecPolicyApprovalDecision;
    reason: ExecPolicyApprovalReason;
    approval?: ExecPolicyApprovalRecord;
  } {
    const timestamp = params.timestamp ?? Date.now();
    const matchedApprovals = this.approvals
      .filter((approval) => matchesScope(approval.scope, params.operation))
      .sort((left, right) => right.timestamp - left.timestamp);

    if (matchedApprovals.length === 0) {
      this.appendAudit({
        operation: params.operation,
        decision: 'deny',
        reason: 'approval_missing',
        timestamp,
      });
      return {
        decision: 'deny',
        reason: 'approval_missing',
      };
    }

    const latestApproval = matchedApprovals[0];

    if (latestApproval.expiresAt <= timestamp) {
      this.appendAudit({
        operation: params.operation,
        decision: 'deny',
        reason: 'approval_expired',
        timestamp,
        approval: latestApproval,
      });
      return {
        decision: 'deny',
        reason: 'approval_expired',
        approval: latestApproval,
      };
    }

    this.appendAudit({
      operation: params.operation,
      decision: 'allow',
      reason: 'approval_valid',
      timestamp,
      approval: latestApproval,
    });

    return {
      decision: 'allow',
      reason: 'approval_valid',
      approval: latestApproval,
    };
  }

  public queryAudit(params?: {
    decision?: ExecPolicyApprovalDecision;
    reason?: ExecPolicyApprovalReason;
  }): ExecPolicyApprovalAuditRecord[] {
    return this.audits.filter((entry) => {
      if (params?.decision && entry.decision !== params.decision) {
        return false;
      }

      if (params?.reason && entry.reason !== params.reason) {
        return false;
      }

      return true;
    });
  }

  public resetForTests(): void {
    this.approvals.splice(0, this.approvals.length);
    this.audits.splice(0, this.audits.length);
  }

  private appendAudit(params: {
    operation: string;
    decision: ExecPolicyApprovalDecision;
    reason: ExecPolicyApprovalReason;
    timestamp: number;
    approval?: ExecPolicyApprovalRecord;
  }): void {
    const audit = ExecPolicyApprovalAuditRecordSchema.parse({
      auditId: randomUUID(),
      operation: params.operation,
      decision: params.decision,
      reason: params.reason,
      timestamp: params.timestamp,
      approvalId: params.approval?.approvalId,
      issuer: params.approval?.issuer,
      scope: params.approval?.scope,
      expiresAt: params.approval?.expiresAt,
    });

    this.audits.push(audit);
  }
}
