/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

type ApprovalStatus = 'pending' | 'approved' | 'denied';
type ApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

type ApprovalSubject = {
  toolName?: string;
  command?: string;
  interpreter?: string;
  script?: string;
  cwd?: string;
  sessionId?: string;
  runId?: string;
  summary?: string;
};

type ApprovalRequestInput = {
  id?: string;
  title: string;
  reason: string;
  source: string;
  riskLevel?: ApprovalRiskLevel;
  ruleId?: string;
  subject?: ApprovalSubject;
  createdAt?: string;
};

type ApprovalRequest = Required<
  Pick<ApprovalRequestInput, 'title' | 'reason' | 'source'>
> & {
  id: string;
  status: ApprovalStatus;
  riskLevel: ApprovalRiskLevel;
  ruleId?: string;
  subject?: ApprovalSubject;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decisionReason?: string;
};

type ApprovalQueueCounts = Record<ApprovalStatus, number>;

type ApprovalQueueSnapshot = {
  requests: ApprovalRequest[];
  counts: ApprovalQueueCounts;
};

type ApprovalQueueOptions = {
  storagePath?: string;
  now?: () => Date;
};

class ApprovalQueue {
  private static instance?: ApprovalQueue;

  private readonly storagePath: string;
  private readonly now: () => Date;
  private requests?: ApprovalRequest[];

  constructor(options: ApprovalQueueOptions = {}) {
    this.storagePath = options.storagePath ?? getDefaultStoragePath();
    this.now = options.now ?? (() => new Date());
  }

  static getInstance(): ApprovalQueue {
    if (!ApprovalQueue.instance) {
      ApprovalQueue.instance = new ApprovalQueue();
    }
    return ApprovalQueue.instance;
  }

  async list(): Promise<ApprovalQueueSnapshot> {
    const requests = await this.loadRequests();
    return {
      requests: [...requests].sort(sortRequests),
      counts: countRequests(requests),
    };
  }

  async submit(input: ApprovalRequestInput): Promise<ApprovalRequest> {
    const requests = await this.loadRequests();
    const requestId = input.id ?? createApprovalRequestId(input);
    const existing = requests.find((request) => request.id === requestId);

    if (existing?.status === 'pending') {
      return existing;
    }

    const now = input.createdAt ?? this.now().toISOString();
    const request: ApprovalRequest = {
      id: requestId,
      title: input.title,
      reason: input.reason,
      source: input.source,
      riskLevel: input.riskLevel ?? 'medium',
      ruleId: input.ruleId,
      subject: input.subject,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const nextRequests = existing
      ? requests.map((item) => (item.id === request.id ? request : item))
      : [...requests, request];
    this.requests = nextRequests;
    await this.persistRequests();

    return request;
  }

  async resolve(
    id: string,
    status: Extract<ApprovalStatus, 'approved' | 'denied'>,
    decisionReason?: string,
  ): Promise<ApprovalRequest> {
    const requests = await this.loadRequests();
    const index = requests.findIndex((request) => request.id === id);
    if (index === -1) {
      throw new Error('Approval request was not found');
    }

    const now = this.now().toISOString();
    const request: ApprovalRequest = {
      ...requests[index],
      status,
      decisionReason,
      decidedAt: now,
      updatedAt: now,
    };
    requests[index] = request;
    this.requests = requests;
    await this.persistRequests();

    return request;
  }

  async clearResolved(): Promise<ApprovalQueueSnapshot> {
    const requests = await this.loadRequests();
    this.requests = requests.filter((request) => request.status === 'pending');
    await this.persistRequests();
    return this.list();
  }

  private async loadRequests(): Promise<ApprovalRequest[]> {
    if (this.requests) {
      return this.requests;
    }

    try {
      const json = await readFile(this.storagePath, 'utf8');
      this.requests = (JSON.parse(json) as ApprovalRequest[]).filter(
        isApprovalRequest,
      );
      return this.requests;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        this.requests = [];
        return this.requests;
      }

      throw error;
    }
  }

  private async persistRequests(): Promise<void> {
    await mkdir(path.dirname(this.storagePath), { recursive: true });
    await writeFile(
      this.storagePath,
      `${JSON.stringify(this.requests ?? [], null, 2)}\n`,
      'utf8',
    );
  }
}

function getDefaultStoragePath(): string {
  const { app } = require('electron') as typeof import('electron');
  return path.join(
    app.getPath('userData'),
    'proofpilot',
    'approval-queue.json',
  );
}

function createApprovalRequestId(input: ApprovalRequestInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        title: input.title,
        source: input.source,
        ruleId: input.ruleId,
        subject: input.subject,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

function sortRequests(a: ApprovalRequest, b: ApprovalRequest): number {
  if (a.status === 'pending' && b.status !== 'pending') {
    return -1;
  }
  if (a.status !== 'pending' && b.status === 'pending') {
    return 1;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

function countRequests(requests: ApprovalRequest[]): ApprovalQueueCounts {
  return requests.reduce<ApprovalQueueCounts>(
    (counts, request) => {
      counts[request.status] += 1;
      return counts;
    },
    { pending: 0, approved: 0, denied: 0 },
  );
}

function isApprovalRequest(value: unknown): value is ApprovalRequest {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.source === 'string' &&
    isApprovalStatus(value.status)
  );
}

function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return value === 'pending' || value === 'approved' || value === 'denied';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error;
}

export { ApprovalQueue };
export type {
  ApprovalQueueCounts,
  ApprovalQueueSnapshot,
  ApprovalRequest,
  ApprovalRequestInput,
  ApprovalRiskLevel,
  ApprovalStatus,
  ApprovalSubject,
};
