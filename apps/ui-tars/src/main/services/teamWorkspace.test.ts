/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { StatusEnum } from '@ui-tars/shared/types';
import { Operator } from '@main/store/types';
import { describe, expect, it } from 'vitest';

import { TeamWorkspaceStore } from './teamWorkspace';
import type { ApprovalQueueSnapshot } from './approvalQueue';
import type { FlightRecorderRunSummary } from './flightRecorder';

describe('TeamWorkspaceStore', () => {
  it('persists workspace settings and members', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-team-'),
    );
    const store = new TeamWorkspaceStore({
      storageRoot,
      now: () => new Date('2026-05-27T00:00:00.000Z'),
      idFactory: () => 'member-1',
    });

    const initial = await store.getWorkspace();
    expect(initial).toMatchObject({
      workspaceName: 'ProofPilot Workspace',
      plan: 'solo',
      policies: {
        defaultRunMode: 'simulation',
        proofPackRequired: true,
      },
    });

    const updated = await store.updateWorkspace({
      workspaceName: 'Launch Ops',
      plan: 'team',
      seatLimit: 4,
      policies: {
        retentionDays: 180,
        approvalRequiredFor: 'all_live_runs',
      },
    });
    expect(updated).toMatchObject({
      workspaceName: 'Launch Ops',
      plan: 'team',
      seatLimit: 4,
      policies: {
        retentionDays: 180,
        approvalRequiredFor: 'all_live_runs',
      },
    });

    const withMember = await store.upsertMember({
      name: 'Reviewer',
      email: 'reviewer@example.com',
      role: 'viewer',
    });
    expect(withMember.members).toHaveLength(2);
    expect(withMember.members[1]).toMatchObject({
      id: 'member-1',
      status: 'invited',
    });

    await expect(store.removeMember('owner-local')).rejects.toThrow(
      'The workspace owner cannot be removed',
    );

    const persisted = JSON.parse(
      await readFile(path.join(storageRoot, 'workspace.json'), 'utf8'),
    );
    expect(persisted.workspaceName).toBe('Launch Ops');
  });

  it('exports a commercial audit report', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-team-'),
    );
    const store = new TeamWorkspaceStore({
      storageRoot,
      now: () => new Date('2026-05-27T00:00:00.000Z'),
      idFactory: () => 'member-1',
    });
    await store.updateWorkspace({
      workspaceName: 'Launch Ops',
    });

    const exportResult = await store.exportAuditReport({
      runs: [createRunSummary('run-1', 'simulation')],
      approvals: createApprovalSnapshot(),
    });
    const json = JSON.parse(await readFile(exportResult.jsonPath, 'utf8'));
    const html = await readFile(exportResult.htmlPath, 'utf8');

    expect(exportResult.reportId).toMatch(/^[a-f0-9]{16}$/);
    expect(json).toMatchObject({
      version: 1,
      workspace: {
        workspaceName: 'Launch Ops',
      },
      metrics: {
        totalRuns: 1,
        simulationRuns: 1,
        pendingApprovals: 1,
      },
    });
    expect(exportResult.readiness.some((item) => item.status === 'ready')).toBe(
      true,
    );
    expect(html).toContain('Team audit report');
    await expect(stat(exportResult.htmlPath)).resolves.toBeTruthy();
  });
});

function createRunSummary(
  runId: string,
  mode: FlightRecorderRunSummary['mode'],
): FlightRecorderRunSummary {
  return {
    version: 1,
    runId,
    mode,
    instruction: 'Compile the workflow',
    operator: Operator.LocalBrowser,
    startedAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
    finishedAt: '2026-05-27T00:01:00.000Z',
    status: StatusEnum.END,
    eventCount: 3,
    artifactCount: 1,
    integrityAlgorithm: 'sha256',
    recordingHash: 'hash',
    storagePath: '/tmp/run-1',
  };
}

function createApprovalSnapshot(): ApprovalQueueSnapshot {
  return {
    requests: [],
    counts: {
      pending: 1,
      approved: 2,
      denied: 0,
    },
  };
}
