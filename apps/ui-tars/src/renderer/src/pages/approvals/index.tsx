/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';

import { api } from '@renderer/api';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import { Textarea } from '@renderer/components/ui/textarea';
import { cn } from '@renderer/utils';

type ApprovalQueueSnapshot = Awaited<
  ReturnType<typeof api.listApprovalRequests>
>;
type ApprovalRequest = ApprovalQueueSnapshot['requests'][number];

export default function Approvals() {
  const [snapshot, setSnapshot] = useState<ApprovalQueueSnapshot>({
    requests: [],
    counts: {
      pending: 0,
      approved: 0,
      denied: 0,
    },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRequest = useMemo(
    () =>
      snapshot.requests.find((request) => request.id === selectedId) ??
      snapshot.requests[0] ??
      null,
    [selectedId, snapshot.requests],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.listApprovalRequests();
      setSnapshot(nextSnapshot);
      setSelectedId((currentId) => {
        if (
          currentId &&
          nextSnapshot.requests.some((request) => request.id === currentId)
        ) {
          return currentId;
        }

        return nextSnapshot.requests[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(readErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setDecisionReason('');
  }, [selectedRequest?.id]);

  const resolveRequest = useCallback(
    async (status: 'approved' | 'denied') => {
      if (!selectedRequest) {
        return;
      }

      setResolvingId(selectedRequest.id);
      setError(null);

      try {
        await api.resolveApprovalRequest({
          id: selectedRequest.id,
          status,
          decisionReason: decisionReason.trim() || undefined,
        });
        await loadQueue();
      } catch (resolveError) {
        setError(readErrorMessage(resolveError));
      } finally {
        setResolvingId(null);
      }
    },
    [decisionReason, loadQueue, selectedRequest],
  );

  const clearResolved = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await api.clearResolvedApprovalRequests();
      setSnapshot(nextSnapshot);
      setSelectedId(nextSnapshot.requests[0]?.id ?? null);
    } catch (clearError) {
      setError(readErrorMessage(clearError));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-5">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger variant="secondary" className="size-8" />
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground">
            <ShieldAlert className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">Approval Queue</h1>
            <p className="truncate text-xs text-muted-foreground">
              Review high-risk agent actions before they continue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearResolved}
            disabled={
              loading || snapshot.requests.length === snapshot.counts.pending
            }
          >
            <Trash2 className="size-4" />
            Clear Resolved
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadQueue}
            disabled={loading}
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-3 gap-2 border-b p-3">
            <Metric label="Pending" value={snapshot.counts.pending} />
            <Metric label="Approved" value={snapshot.counts.approved} />
            <Metric label="Denied" value={snapshot.counts.denied} />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {loading && snapshot.requests.length === 0 ? (
                <QueueSkeleton />
              ) : snapshot.requests.length === 0 ? (
                <EmptyState />
              ) : (
                snapshot.requests.map((request) => (
                  <ApprovalListItem
                    key={request.id}
                    request={request}
                    selected={request.id === selectedRequest?.id}
                    onSelect={() => setSelectedId(request.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="min-h-0">
          {selectedRequest ? (
            <ApprovalDetail
              request={selectedRequest}
              decisionReason={decisionReason}
              onDecisionReasonChange={setDecisionReason}
              resolving={resolvingId === selectedRequest.id}
              onApprove={() => resolveRequest('approved')}
              onDeny={() => resolveRequest('denied')}
            />
          ) : (
            <NoSelectionState />
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-lg font-semibold leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ApprovalListItem({
  request,
  selected,
  onSelect,
}: {
  request: ApprovalRequest;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        'w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/60',
        selected && 'border-primary bg-primary/5',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-medium leading-snug">
            {request.title}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            <span className="truncate">{formatDate(request.createdAt)}</span>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <RiskBadge riskLevel={request.riskLevel} />
        <span>{request.source}</span>
        {request.ruleId && <span>{request.ruleId}</span>}
      </div>
    </button>
  );
}

function ApprovalDetail({
  request,
  decisionReason,
  onDecisionReasonChange,
  resolving,
  onApprove,
  onDeny,
}: {
  request: ApprovalRequest;
  decisionReason: string;
  onDecisionReasonChange: (value: string) => void;
  resolving: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const isPending = request.status === 'pending';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">
                {request.title}
              </h2>
              <StatusBadge status={request.status} />
              <RiskBadge riskLevel={request.riskLevel} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{request.source}</span>
              <span>{formatDate(request.createdAt)}</span>
              {request.ruleId && <span>{request.ruleId}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDeny}
              disabled={!isPending || resolving}
            >
              <XCircle className="size-4" />
              Deny
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={!isPending || resolving}
            >
              <CheckCircle2 className="size-4" />
              Approve
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-5 p-5">
          <section className="rounded-md border p-4">
            <h3 className="text-sm font-semibold">Reason</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {request.reason}
            </p>
          </section>

          <section className="rounded-md border p-4">
            <h3 className="text-sm font-semibold">Request Subject</h3>
            <div className="mt-3 grid gap-3">
              {formatSubjectRows(request).map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1 text-sm md:grid-cols-[8rem_minmax(0,1fr)]"
                >
                  <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    {row.label}
                  </div>
                  <div className="min-w-0 whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border p-4">
            <h3 className="text-sm font-semibold">Decision Note</h3>
            {isPending ? (
              <Textarea
                value={decisionReason}
                onChange={(event) =>
                  onDecisionReasonChange(event.currentTarget.value)
                }
                className="mt-3 min-h-24 resize-none"
                placeholder="Optional context for why this was approved or denied."
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {request.decisionReason || 'No decision note recorded.'}
              </p>
            )}
            {request.decidedAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                Decided {formatDate(request.decidedAt)}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: ApprovalRequest['status'] }) {
  const Icon =
    status === 'approved'
      ? CheckCircle2
      : status === 'denied'
        ? XCircle
        : AlertTriangle;

  return (
    <Badge
      variant="outline"
      className={cn('capitalize', getStatusClass(status))}
    >
      <Icon className="size-3" />
      {status}
    </Badge>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: ApprovalRequest['riskLevel'] }) {
  return (
    <Badge
      variant="outline"
      className={cn('capitalize', getRiskClass(riskLevel))}
    >
      {riskLevel}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed px-6 text-center">
      <ShieldAlert className="size-8 text-muted-foreground" />
      <div className="mt-3 text-sm font-medium">No approval requests</div>
      <div className="mt-1 text-xs text-muted-foreground">
        High-risk actions will appear here before they continue.
      </div>
    </div>
  );
}

function NoSelectionState() {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center">
      <ShieldAlert className="size-9 text-muted-foreground" />
      <div className="mt-3 text-sm font-medium">Select an approval request</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Review the request details and approve or deny the action.
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-md border bg-muted"
        />
      ))}
    </>
  );
}

function formatSubjectRows(request: ApprovalRequest) {
  const subject = request.subject ?? {};
  return [
    ['Request ID', request.id],
    ['Tool', subject.toolName],
    ['Command', subject.command],
    ['Interpreter', subject.interpreter],
    ['Script', subject.script],
    ['Working Dir', subject.cwd],
    ['Session', subject.sessionId],
    ['Run', subject.runId],
    ['Summary', subject.summary],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({
      label: label ?? '',
      value: String(value),
    }));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getStatusClass(status: ApprovalRequest['status']) {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'denied':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function getRiskClass(riskLevel: ApprovalRequest['riskLevel']) {
  switch (riskLevel) {
    case 'critical':
      return 'border-red-300 bg-red-50 text-red-700';
    case 'high':
      return 'border-orange-300 bg-orange-50 text-orange-700';
    case 'medium':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'low':
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
