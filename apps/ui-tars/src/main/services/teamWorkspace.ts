/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { ApprovalQueueSnapshot } from './approvalQueue';
import type { FlightRecorderRunSummary } from './flightRecorder';

const require = createRequire(import.meta.url);

type TeamPlan = 'solo' | 'team' | 'business';
type TeamMemberRole = 'owner' | 'admin' | 'operator' | 'viewer';
type TeamMemberStatus = 'active' | 'invited';
type ReadinessStatus = 'ready' | 'needs_attention';

type TeamPolicies = {
  defaultRunMode: 'simulation' | 'live';
  approvalRequiredFor: 'none' | 'high_risk' | 'all_live_runs';
  retentionDays: number;
  proofPackRequired: boolean;
  auditExportsEnabled: boolean;
  allowLiveRuns: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
};

type TeamWorkspace = {
  version: 1;
  workspaceName: string;
  plan: TeamPlan;
  seatLimit: number;
  members: TeamMember[];
  policies: TeamPolicies;
  createdAt: string;
  updatedAt: string;
};

type TeamWorkspaceUpdate = Partial<
  Pick<TeamWorkspace, 'workspaceName' | 'plan' | 'seatLimit'>
> & {
  policies?: Partial<TeamPolicies>;
};

type TeamMemberInput = {
  id?: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status?: TeamMemberStatus;
};

type TeamAuditReadinessItem = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

type TeamAuditReport = {
  version: 1;
  reportId: string;
  generatedAt: string;
  workspace: TeamWorkspace;
  metrics: {
    totalRuns: number;
    liveRuns: number;
    simulationRuns: number;
    verifiedRuns: number;
    failedIntegrityRuns: number;
    pendingApprovals: number;
    approvedRequests: number;
    deniedRequests: number;
  };
  readiness: TeamAuditReadinessItem[];
  recentRuns: Array<{
    runId: string;
    mode: string;
    status: string;
    startedAt: string;
    eventCount: number;
    artifactCount: number;
  }>;
};

type TeamAuditExport = {
  reportId: string;
  auditDirectory: string;
  jsonPath: string;
  htmlPath: string;
  generatedAt: string;
  readiness: TeamAuditReadinessItem[];
};

type TeamAuditInput = {
  runs: FlightRecorderRunSummary[];
  approvals: ApprovalQueueSnapshot;
};

type TeamWorkspaceOptions = {
  storageRoot?: string;
  now?: () => Date;
  idFactory?: () => string;
};

class TeamWorkspaceStore {
  private static instance?: TeamWorkspaceStore;

  private readonly storageRoot: string;
  private readonly workspacePath: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private workspace?: TeamWorkspace;

  constructor(options: TeamWorkspaceOptions = {}) {
    this.storageRoot = options.storageRoot ?? getDefaultStorageRoot();
    this.workspacePath = path.join(this.storageRoot, 'workspace.json');
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  static getInstance(): TeamWorkspaceStore {
    if (!TeamWorkspaceStore.instance) {
      TeamWorkspaceStore.instance = new TeamWorkspaceStore();
    }
    return TeamWorkspaceStore.instance;
  }

  async getWorkspace(): Promise<TeamWorkspace> {
    return this.loadWorkspace();
  }

  async updateWorkspace(input: TeamWorkspaceUpdate): Promise<TeamWorkspace> {
    const workspace = await this.loadWorkspace();
    const updated: TeamWorkspace = {
      ...workspace,
      workspaceName: input.workspaceName?.trim() || workspace.workspaceName,
      plan: input.plan ?? workspace.plan,
      seatLimit: normalizeSeatLimit(input.seatLimit, workspace.seatLimit),
      policies: {
        ...workspace.policies,
        ...input.policies,
        retentionDays: normalizeRetentionDays(
          input.policies?.retentionDays,
          workspace.policies.retentionDays,
        ),
      },
      updatedAt: this.now().toISOString(),
    };

    this.workspace = updated;
    await this.persistWorkspace(updated);
    return updated;
  }

  async upsertMember(input: TeamMemberInput): Promise<TeamWorkspace> {
    const workspace = await this.loadWorkspace();
    const now = this.now().toISOString();
    const member: TeamMember = {
      id: input.id ?? this.idFactory(),
      name: input.name.trim(),
      email: input.email.trim(),
      role: input.role,
      status: input.status ?? 'invited',
      joinedAt:
        workspace.members.find((item) => item.id === input.id)?.joinedAt ?? now,
    };

    if (!member.name || !member.email) {
      throw new Error('Team member name and email are required');
    }

    const members = workspace.members.some((item) => item.id === member.id)
      ? workspace.members.map((item) => (item.id === member.id ? member : item))
      : [...workspace.members, member];

    const updated: TeamWorkspace = {
      ...workspace,
      members,
      updatedAt: now,
    };
    this.workspace = updated;
    await this.persistWorkspace(updated);
    return updated;
  }

  async removeMember(memberId: string): Promise<TeamWorkspace> {
    const workspace = await this.loadWorkspace();
    const member = workspace.members.find((item) => item.id === memberId);
    if (!member) {
      return workspace;
    }
    if (member.role === 'owner') {
      throw new Error('The workspace owner cannot be removed');
    }

    const updated: TeamWorkspace = {
      ...workspace,
      members: workspace.members.filter((item) => item.id !== memberId),
      updatedAt: this.now().toISOString(),
    };
    this.workspace = updated;
    await this.persistWorkspace(updated);
    return updated;
  }

  async exportAuditReport(input: TeamAuditInput): Promise<TeamAuditExport> {
    const workspace = await this.loadWorkspace();
    const generatedAt = this.now().toISOString();
    const report = createAuditReport(workspace, input, generatedAt);
    const auditDirectory = path.join(
      this.storageRoot,
      'audit-reports',
      report.reportId,
    );
    const jsonPath = path.join(auditDirectory, 'team-audit.json');
    const htmlPath = path.join(auditDirectory, 'team-audit.html');

    await mkdir(auditDirectory, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(htmlPath, renderAuditReportHtml(report), 'utf8');

    return {
      reportId: report.reportId,
      auditDirectory,
      jsonPath,
      htmlPath,
      generatedAt,
      readiness: report.readiness,
    };
  }

  private async loadWorkspace(): Promise<TeamWorkspace> {
    if (this.workspace) {
      return this.workspace;
    }

    try {
      const json = await readFile(this.workspacePath, 'utf8');
      this.workspace = normalizeWorkspace(JSON.parse(json), this.now);
      return this.workspace;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        this.workspace = createDefaultWorkspace(this.now().toISOString());
        await this.persistWorkspace(this.workspace);
        return this.workspace;
      }

      throw error;
    }
  }

  private async persistWorkspace(workspace: TeamWorkspace): Promise<void> {
    await mkdir(path.dirname(this.workspacePath), { recursive: true });
    await writeFile(
      this.workspacePath,
      `${JSON.stringify(workspace, null, 2)}\n`,
      'utf8',
    );
  }
}

function createDefaultWorkspace(now: string): TeamWorkspace {
  return {
    version: 1,
    workspaceName: 'ProofPilot Workspace',
    plan: 'solo',
    seatLimit: 1,
    members: [
      {
        id: 'owner-local',
        name: 'Workspace Owner',
        email: 'owner@local',
        role: 'owner',
        status: 'active',
        joinedAt: now,
      },
    ],
    policies: {
      defaultRunMode: 'simulation',
      approvalRequiredFor: 'high_risk',
      retentionDays: 90,
      proofPackRequired: true,
      auditExportsEnabled: true,
      allowLiveRuns: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeWorkspace(value: unknown, now: () => Date): TeamWorkspace {
  if (!isRecord(value)) {
    return createDefaultWorkspace(now().toISOString());
  }

  const fallback = createDefaultWorkspace(now().toISOString());
  return {
    ...fallback,
    ...value,
    version: 1,
    workspaceName:
      typeof value.workspaceName === 'string'
        ? value.workspaceName
        : fallback.workspaceName,
    plan: isTeamPlan(value.plan) ? value.plan : fallback.plan,
    seatLimit: normalizeSeatLimit(value.seatLimit, fallback.seatLimit),
    members: Array.isArray(value.members)
      ? value.members.filter(isTeamMember)
      : fallback.members,
    policies: {
      ...fallback.policies,
      ...(isRecord(value.policies) ? value.policies : {}),
      retentionDays: normalizeRetentionDays(
        isRecord(value.policies) ? value.policies.retentionDays : undefined,
        fallback.policies.retentionDays,
      ),
    },
  };
}

function createAuditReport(
  workspace: TeamWorkspace,
  input: TeamAuditInput,
  generatedAt: string,
): TeamAuditReport {
  const metrics = {
    totalRuns: input.runs.length,
    liveRuns: input.runs.filter((run) => run.mode === 'live').length,
    simulationRuns: input.runs.filter((run) => run.mode === 'simulation')
      .length,
    verifiedRuns: input.runs.filter((run) => Boolean(run.recordingHash)).length,
    failedIntegrityRuns: 0,
    pendingApprovals: input.approvals.counts.pending,
    approvedRequests: input.approvals.counts.approved,
    deniedRequests: input.approvals.counts.denied,
  };
  const reportId = createHash('sha256')
    .update(
      JSON.stringify({
        workspaceName: workspace.workspaceName,
        generatedAt,
        metrics,
      }),
    )
    .digest('hex')
    .slice(0, 16);

  return {
    version: 1,
    reportId,
    generatedAt,
    workspace,
    metrics,
    readiness: createReadinessItems(workspace, metrics),
    recentRuns: input.runs.slice(0, 10).map((run) => ({
      runId: run.runId,
      mode: run.mode,
      status: run.status,
      startedAt: run.startedAt,
      eventCount: run.eventCount,
      artifactCount: run.artifactCount,
    })),
  };
}

function createReadinessItems(
  workspace: TeamWorkspace,
  metrics: TeamAuditReport['metrics'],
): TeamAuditReadinessItem[] {
  return [
    {
      id: 'simulation-default',
      label: 'Simulation default',
      status:
        workspace.policies.defaultRunMode === 'simulation'
          ? 'ready'
          : 'needs_attention',
      detail:
        workspace.policies.defaultRunMode === 'simulation'
          ? 'New workflows default to simulation before live execution.'
          : 'New workflows default to live execution.',
    },
    {
      id: 'approval-policy',
      label: 'Approval policy',
      status:
        workspace.policies.approvalRequiredFor === 'none'
          ? 'needs_attention'
          : 'ready',
      detail: `Approval mode is ${workspace.policies.approvalRequiredFor}.`,
    },
    {
      id: 'proof-pack-policy',
      label: 'Proof pack policy',
      status: workspace.policies.proofPackRequired
        ? 'ready'
        : 'needs_attention',
      detail: workspace.policies.proofPackRequired
        ? 'Proof packs are required for customer-facing workflows.'
        : 'Proof packs are optional.',
    },
    {
      id: 'audit-export',
      label: 'Audit export',
      status: workspace.policies.auditExportsEnabled
        ? 'ready'
        : 'needs_attention',
      detail: workspace.policies.auditExportsEnabled
        ? 'Audit exports are enabled.'
        : 'Audit exports are disabled.',
    },
    {
      id: 'team-roster',
      label: 'Team roster',
      status:
        workspace.members.length <= workspace.seatLimit
          ? 'ready'
          : 'needs_attention',
      detail: `${workspace.members.length} member(s) configured for ${workspace.seatLimit} seat(s).`,
    },
    {
      id: 'run-evidence',
      label: 'Run evidence',
      status:
        metrics.totalRuns === 0 || metrics.verifiedRuns > 0
          ? 'ready'
          : 'needs_attention',
      detail:
        metrics.totalRuns === 0
          ? 'No runs have been recorded yet.'
          : `${metrics.verifiedRuns} run(s) have tamper-evident hashes.`,
    },
  ];
}

function renderAuditReportHtml(report: TeamAuditReport): string {
  const readinessRows = report.readiness
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.label)}</td>
        <td><span class="badge ${item.status}">${escapeHtml(item.status.replace('_', ' '))}</span></td>
        <td>${escapeHtml(item.detail)}</td>
      </tr>`,
    )
    .join('\n');
  const runRows = report.recentRuns
    .map(
      (run) => `<tr>
        <td class="hash">${escapeHtml(run.runId)}</td>
        <td>${escapeHtml(run.mode)}</td>
        <td>${escapeHtml(run.status)}</td>
        <td>${escapeHtml(run.startedAt)}</td>
        <td>${run.eventCount}</td>
        <td>${run.artifactCount}</td>
      </tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Team Audit - ${escapeHtml(report.workspace.workspaceName)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f8fafc; }
    body { margin: 0; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 24px 56px; }
    header, section { border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    .muted { color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 20px; }
    .metric { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .metric span { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; }
    .metric strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; border-top: 1px solid #e5e7eb; padding: 10px 8px; vertical-align: top; }
    th { color: #64748b; font-size: 12px; text-transform: uppercase; }
    .badge { display: inline-flex; border-radius: 999px; border: 1px solid #d1d5db; padding: 3px 8px; font-size: 12px; font-weight: 600; }
    .badge.ready { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
    .badge.needs_attention { color: #92400e; background: #fffbeb; border-color: #fde68a; }
    .hash { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(report.workspace.workspaceName)}</h1>
      <div class="muted">Team audit report | ${escapeHtml(report.generatedAt)} | ${escapeHtml(report.reportId)}</div>
      <div class="grid">
        <div class="metric"><span>Plan</span><strong>${escapeHtml(report.workspace.plan)}</strong></div>
        <div class="metric"><span>Members</span><strong>${report.workspace.members.length}/${report.workspace.seatLimit}</strong></div>
        <div class="metric"><span>Total runs</span><strong>${report.metrics.totalRuns}</strong></div>
        <div class="metric"><span>Pending approvals</span><strong>${report.metrics.pendingApprovals}</strong></div>
      </div>
    </header>
    <section>
      <h2>Commercial readiness</h2>
      <table><thead><tr><th>Control</th><th>Status</th><th>Detail</th></tr></thead><tbody>${readinessRows}</tbody></table>
    </section>
    <section>
      <h2>Recent runs</h2>
      <table><thead><tr><th>Run</th><th>Mode</th><th>Status</th><th>Started</th><th>Events</th><th>Files</th></tr></thead><tbody>${runRows}</tbody></table>
    </section>
  </main>
</body>
</html>
`;
}

function getDefaultStorageRoot(): string {
  const { app } = require('electron') as typeof import('electron');
  return path.join(app.getPath('userData'), 'proofpilot', 'team');
}

function normalizeSeatLimit(value: unknown, fallback: number): number {
  return normalizePositiveInteger(value, fallback, 1, 500);
}

function normalizeRetentionDays(value: unknown, fallback: number): number {
  return normalizePositiveInteger(value, fallback, 1, 3650);
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function isTeamPlan(value: unknown): value is TeamPlan {
  return value === 'solo' || value === 'team' || value === 'business';
}

function isTeamMember(value: unknown): value is TeamMember {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    isTeamMemberRole(value.role) &&
    isTeamMemberStatus(value.status) &&
    typeof value.joinedAt === 'string'
  );
}

function isTeamMemberRole(value: unknown): value is TeamMemberRole {
  return (
    value === 'owner' ||
    value === 'admin' ||
    value === 'operator' ||
    value === 'viewer'
  );
}

function isTeamMemberStatus(value: unknown): value is TeamMemberStatus {
  return value === 'active' || value === 'invited';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { TeamWorkspaceStore };
export type {
  TeamAuditExport,
  TeamAuditReadinessItem,
  TeamAuditReport,
  TeamMember,
  TeamMemberInput,
  TeamMemberRole,
  TeamMemberStatus,
  TeamPlan,
  TeamPolicies,
  TeamWorkspace,
  TeamWorkspaceUpdate,
};
