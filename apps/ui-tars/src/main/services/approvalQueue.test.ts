/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
}));

import { ApprovalQueue } from './approvalQueue';

describe('ApprovalQueue', () => {
  it('persists approval requests and decisions', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-approval-queue-'),
    );
    const storagePath = path.join(storageRoot, 'approval-queue.json');
    let tick = 0;
    const queue = new ApprovalQueue({
      storagePath,
      now: () => new Date(`2026-05-26T00:00:0${tick++}.000Z`),
    });

    const request = await queue.submit({
      title: 'Approve destructive command',
      reason: 'The command forcefully removes files.',
      source: 'commands',
      riskLevel: 'critical',
      ruleId: 'destructive-file-removal',
      subject: {
        toolName: 'run_command',
        command: 'rm -rf ./dist',
        cwd: '/repo',
      },
    });

    expect(request.status).toBe('pending');
    await expect(queue.list()).resolves.toMatchObject({
      counts: {
        pending: 1,
        approved: 0,
        denied: 0,
      },
      requests: [
        {
          id: request.id,
          status: 'pending',
          riskLevel: 'critical',
        },
      ],
    });

    await queue.resolve(
      request.id,
      'approved',
      'User verified the target path.',
    );

    const reloadedQueue = new ApprovalQueue({ storagePath });
    await expect(reloadedQueue.list()).resolves.toMatchObject({
      counts: {
        pending: 0,
        approved: 1,
        denied: 0,
      },
      requests: [
        {
          id: request.id,
          status: 'approved',
          decisionReason: 'User verified the target path.',
        },
      ],
    });
  });

  it('can clear resolved requests while keeping pending requests', async () => {
    const storageRoot = await mkdtemp(
      path.join(os.tmpdir(), 'proofpilot-approval-queue-'),
    );
    const queue = new ApprovalQueue({
      storagePath: path.join(storageRoot, 'approval-queue.json'),
    });

    const first = await queue.submit({
      title: 'Approve command',
      reason: 'Needs approval.',
      source: 'commands',
    });
    await queue.submit({
      title: 'Approve script',
      reason: 'Needs approval.',
      source: 'commands',
    });
    await queue.resolve(first.id, 'denied');

    await expect(queue.clearResolved()).resolves.toMatchObject({
      counts: {
        pending: 1,
        approved: 0,
        denied: 0,
      },
    });
  });
});
