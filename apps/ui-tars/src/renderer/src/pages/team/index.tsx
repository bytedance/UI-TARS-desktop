/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { api } from '@renderer/api';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import { Switch } from '@renderer/components/ui/switch';
import { cn } from '@renderer/utils';

type TeamWorkspace = Awaited<ReturnType<typeof api.getTeamWorkspace>>;
type TeamMember = TeamWorkspace['members'][number];
type TeamPlan = TeamWorkspace['plan'];
type TeamMemberRole = TeamMember['role'];
type TeamAuditExportResult = Awaited<
  ReturnType<typeof api.exportTeamAuditReport>
>;

type WorkspaceForm = {
  workspaceName: string;
  plan: TeamPlan;
  seatLimit: number;
  defaultRunMode: TeamWorkspace['policies']['defaultRunMode'];
  approvalRequiredFor: TeamWorkspace['policies']['approvalRequiredFor'];
  retentionDays: number;
  proofPackRequired: boolean;
  auditExportsEnabled: boolean;
  allowLiveRuns: boolean;
};

const planOptions: TeamPlan[] = ['solo', 'team', 'business'];
const roleOptions: TeamMemberRole[] = ['admin', 'operator', 'viewer'];

export default function TeamConsole() {
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [form, setForm] = useState<WorkspaceForm | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<TeamMemberRole>('viewer');
  const [auditResult, setAuditResult] = useState<TeamAuditExportResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextWorkspace = await api.getTeamWorkspace();
      setWorkspace(nextWorkspace);
      setForm(createWorkspaceForm(nextWorkspace));
    } catch (loadError) {
      setError(readErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const metrics = useMemo(() => {
    if (!workspace) {
      return {
        seats: '0/0',
        admins: 0,
        operators: 0,
        viewers: 0,
      };
    }

    return {
      seats: `${workspace.members.length}/${workspace.seatLimit}`,
      admins: workspace.members.filter((member) => member.role === 'admin')
        .length,
      operators: workspace.members.filter(
        (member) => member.role === 'operator',
      ).length,
      viewers: workspace.members.filter((member) => member.role === 'viewer')
        .length,
    };
  }, [workspace]);

  const handleSave = useCallback(async () => {
    if (!form) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await api.updateTeamWorkspace({
        workspaceName: form.workspaceName,
        plan: form.plan,
        seatLimit: form.seatLimit,
        policies: {
          defaultRunMode: form.defaultRunMode,
          approvalRequiredFor: form.approvalRequiredFor,
          retentionDays: form.retentionDays,
          proofPackRequired: form.proofPackRequired,
          auditExportsEnabled: form.auditExportsEnabled,
          allowLiveRuns: form.allowLiveRuns,
        },
      });
      setWorkspace(updated);
      setForm(createWorkspaceForm(updated));
    } catch (saveError) {
      setError(readErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleAddMember = useCallback(async () => {
    setError(null);

    try {
      const updated = await api.upsertTeamMember({
        name: memberName,
        email: memberEmail,
        role: memberRole,
      });
      setWorkspace(updated);
      setForm(createWorkspaceForm(updated));
      setMemberName('');
      setMemberEmail('');
      setMemberRole('viewer');
    } catch (memberError) {
      setError(readErrorMessage(memberError));
    }
  }, [memberEmail, memberName, memberRole]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    setError(null);

    try {
      const updated = await api.removeTeamMember({ id: memberId });
      setWorkspace(updated);
      setForm(createWorkspaceForm(updated));
    } catch (removeError) {
      setError(readErrorMessage(removeError));
    }
  }, []);

  const handleExportAudit = useCallback(async () => {
    setExporting(true);
    setError(null);

    try {
      const result = await api.exportTeamAuditReport({ reveal: true });
      setAuditResult(result);
    } catch (exportError) {
      setError(readErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-5">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger variant="secondary" className="size-8" />
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">Team Workspace</h1>
            <p className="truncate text-xs text-muted-foreground">
              Commercial controls
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadWorkspace}
            disabled={loading}
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAudit}
            disabled={exporting || !workspace}
          >
            <Download className={cn('size-4', exporting && 'animate-pulse')} />
            Export Audit
          </Button>
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <main className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <section className="rounded-md border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Workspace Profile</h2>
                  <p className="text-xs text-muted-foreground">
                    Billing-ready identity and seat configuration.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !form}
                >
                  <Save className="size-4" />
                  Save
                </Button>
              </div>
              {form ? (
                <div className="grid gap-4 p-4 md:grid-cols-3">
                  <Field label="Workspace">
                    <Input
                      value={form.workspaceName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          workspaceName: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Plan">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={form.plan}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          plan: event.target.value as TeamPlan,
                        })
                      }
                    >
                      {planOptions.map((plan) => (
                        <option key={plan} value={plan}>
                          {formatLabel(plan)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Seat Limit">
                    <Input
                      type="number"
                      min={1}
                      value={form.seatLimit}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          seatLimit: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Loading workspace...
                </div>
              )}
            </section>

            <section className="rounded-md border">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Governance Policy</h2>
                <p className="text-xs text-muted-foreground">
                  Defaults that make the product easier to sell into teams.
                </p>
              </div>
              {form && (
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  <Field label="Default Run Mode">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={form.defaultRunMode}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          defaultRunMode: event.target
                            .value as WorkspaceForm['defaultRunMode'],
                        })
                      }
                    >
                      <option value="simulation">Simulation</option>
                      <option value="live">Live</option>
                    </select>
                  </Field>
                  <Field label="Approval Required For">
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={form.approvalRequiredFor}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          approvalRequiredFor: event.target
                            .value as WorkspaceForm['approvalRequiredFor'],
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="high_risk">High Risk</option>
                      <option value="all_live_runs">All Live Runs</option>
                    </select>
                  </Field>
                  <Field label="Retention Days">
                    <Input
                      type="number"
                      min={1}
                      value={form.retentionDays}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          retentionDays: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3">
                    <PolicyToggle
                      label="Require proof packs"
                      checked={form.proofPackRequired}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, proofPackRequired: checked })
                      }
                    />
                    <PolicyToggle
                      label="Enable audit exports"
                      checked={form.auditExportsEnabled}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, auditExportsEnabled: checked })
                      }
                    />
                    <PolicyToggle
                      label="Allow live runs"
                      checked={form.allowLiveRuns}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, allowLiveRuns: checked })
                      }
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-md border">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Members</h2>
                <p className="text-xs text-muted-foreground">
                  Local roster for roles, review ownership, and future billing.
                </p>
              </div>
              <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_1fr_160px_auto]">
                <Input
                  placeholder="Name"
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                />
                <Input
                  placeholder="Email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                />
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={memberRole}
                  onChange={(event) =>
                    setMemberRole(event.target.value as TeamMemberRole)
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatLabel(role)}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddMember}
                  disabled={!memberName.trim() || !memberEmail.trim()}
                >
                  <UserPlus className="size-4" />
                  Add
                </Button>
              </div>
              <div className="divide-y">
                {workspace?.members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    onRemove={() => handleRemoveMember(member.id)}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-md border">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Readiness Snapshot</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                <Metric icon={Users} label="Seats" value={metrics.seats} />
                <Metric
                  icon={BarChart3}
                  label="Plan"
                  value={workspace ? formatLabel(workspace.plan) : '-'}
                />
                <Metric icon={Users} label="Admins" value={metrics.admins} />
                <Metric
                  icon={Users}
                  label="Operators"
                  value={metrics.operators}
                />
              </div>
            </section>

            {auditResult && (
              <section className="rounded-md border">
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold">Last Audit Export</h2>
                </div>
                <div className="space-y-3 p-4 text-xs">
                  <div>
                    <div className="text-muted-foreground">Report</div>
                    <div className="break-all font-mono">
                      {auditResult.reportId}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">HTML</div>
                    <div className="break-all">{auditResult.htmlPath}</div>
                  </div>
                  <div className="grid gap-2">
                    {auditResult.readiness.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{item.label}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            item.status === 'ready'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700',
                          )}
                        >
                          {formatLabel(item.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </aside>
        </main>
      </ScrollArea>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PolicyToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-9 items-center justify-between gap-3 rounded-md border px-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function MemberRow({
  member,
  onRemove,
}: {
  member: TeamMember;
  onRemove: () => void;
}) {
  return (
    <div className="grid items-center gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_180px_120px_auto]">
      <div className="min-w-0">
        <div className="truncate font-medium">{member.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {member.email}
        </div>
      </div>
      <Badge variant="outline">{formatLabel(member.role)}</Badge>
      <Badge
        variant="outline"
        className={
          member.status === 'active'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-blue-200 bg-blue-50 text-blue-700'
        }
      >
        {formatLabel(member.status)}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onRemove}
        disabled={member.role === 'owner'}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-semibold leading-none tabular-nums">
          {value}
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function createWorkspaceForm(workspace: TeamWorkspace): WorkspaceForm {
  return {
    workspaceName: workspace.workspaceName,
    plan: workspace.plan,
    seatLimit: workspace.seatLimit,
    defaultRunMode: workspace.policies.defaultRunMode,
    approvalRequiredFor: workspace.policies.approvalRequiredFor,
    retentionDays: workspace.policies.retentionDays,
    proofPackRequired: workspace.policies.proofPackRequired,
    auditExportsEnabled: workspace.policies.auditExportsEnabled,
    allowLiveRuns: workspace.policies.allowLiveRuns,
  };
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
