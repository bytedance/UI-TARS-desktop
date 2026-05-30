/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Download,
  FileClock,
  FlaskConical,
  MousePointerClick,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import { api } from '@renderer/api';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { SidebarTrigger } from '@renderer/components/ui/sidebar';
import { cn } from '@renderer/utils';
import { StatusEnum } from '@ui-tars/shared/types';

type ProofPilotRunSummary = Awaited<
  ReturnType<typeof api.listProofPilotRuns>
>[number];
type ProofPilotRunDetail = NonNullable<
  Awaited<ReturnType<typeof api.getProofPilotRun>>
>;
type ProofPilotEvent = ProofPilotRunDetail['events'][number];
type ProofPackExportResult = Awaited<
  ReturnType<typeof api.exportProofPilotRun>
>;
type WorkflowCapsuleExportResult = Awaited<
  ReturnType<typeof api.exportProofPilotWorkflowCapsule>
>;
type CompiledWorkflowExportResult = Awaited<
  ReturnType<typeof api.compileProofPilotWorkflow>
>;

type PayloadRecord = Record<string, unknown>;
type ArtifactPreview = {
  id: string;
  kind?: string;
  relativePath: string;
  mime?: string;
  bytes?: number;
  dataUrl?: string;
  missing?: boolean;
};

const eventLabels: Record<ProofPilotEvent['type'], string> = {
  run_started: 'Run started',
  status_changed: 'Status changed',
  conversation_added: 'Conversation captured',
  action_planned: 'Action planned',
  simulation_action_skipped: 'Simulation action skipped',
  run_error: 'Run error',
  run_finished: 'Run finished',
};

export default function ProofPilot() {
  const [runs, setRuns] = useState<ProofPilotRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProofPilotRunDetail | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);
  const [exportingCapsuleRunId, setExportingCapsuleRunId] = useState<
    string | null
  >(null);
  const [compilingRunId, setCompilingRunId] = useState<string | null>(null);
  const [exportResult, setExportResult] =
    useState<ProofPackExportResult | null>(null);
  const [capsuleResult, setCapsuleResult] =
    useState<WorkflowCapsuleExportResult | null>(null);
  const [compiledWorkflowResult, setCompiledWorkflowResult] =
    useState<CompiledWorkflowExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setError(null);

    try {
      const nextRuns = await api.listProofPilotRuns();
      setRuns(nextRuns);
      setSelectedRunId((currentRunId) => {
        if (
          currentRunId &&
          nextRuns.some((run) => run.runId === currentRunId)
        ) {
          return currentRunId;
        }

        return nextRuns[0]?.runId ?? null;
      });
    } catch (loadError) {
      setError(readErrorMessage(loadError));
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleExport = useCallback(async (runId: string) => {
    setExportingRunId(runId);
    setError(null);

    try {
      const result = await api.exportProofPilotRun({ runId, open: true });
      setExportResult(result);
    } catch (exportError) {
      setError(readErrorMessage(exportError));
    } finally {
      setExportingRunId(null);
    }
  }, []);

  const handleCreateCapsule = useCallback(async (runId: string) => {
    setExportingCapsuleRunId(runId);
    setError(null);

    try {
      const result = await api.exportProofPilotWorkflowCapsule({
        runId,
        reveal: true,
      });
      setCapsuleResult(result);
    } catch (exportError) {
      setError(readErrorMessage(exportError));
    } finally {
      setExportingCapsuleRunId(null);
    }
  }, []);

  const handleCompileWorkflow = useCallback(async (runId: string) => {
    setCompilingRunId(runId);
    setError(null);

    try {
      const result = await api.compileProofPilotWorkflow({
        runId,
        reveal: true,
      });
      setCompiledWorkflowResult(result);
    } catch (compileError) {
      setError(readErrorMessage(compileError));
    } finally {
      setCompilingRunId(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setError(null);

    api
      .getProofPilotRun({ runId: selectedRunId })
      .then((run) => {
        if (!cancelled) {
          setDetail(run);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(readErrorMessage(loadError));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  const totals = useMemo(
    () => ({
      runs: runs.length,
      events: runs.reduce((count, run) => count + run.eventCount, 0),
      artifacts: runs.reduce((count, run) => count + run.artifactCount, 0),
    }),
    [runs],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-5">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger variant="secondary" className="size-8" />
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">ProofPilot</h1>
            <p className="truncate text-xs text-muted-foreground">
              Agent flight recorder
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadRuns}
          disabled={runsLoading}
        >
          <RefreshCw className={cn('size-4', runsLoading && 'animate-spin')} />
          Refresh
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-3 gap-2 border-b p-3">
            <Metric label="Runs" value={totals.runs} />
            <Metric label="Events" value={totals.events} />
            <Metric label="Files" value={totals.artifacts} />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {runsLoading && runs.length === 0 ? (
                <RunListSkeleton />
              ) : runs.length === 0 ? (
                <EmptyState />
              ) : (
                runs.map((run) => (
                  <RunListItem
                    key={run.runId}
                    run={run}
                    selected={run.runId === selectedRunId}
                    onSelect={() => setSelectedRunId(run.runId)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="min-h-0">
          {error ? (
            <ErrorState message={error} onRetry={loadRuns} />
          ) : detailLoading && !detail ? (
            <DetailSkeleton />
          ) : detail ? (
            <RunDetail
              run={detail}
              exporting={exportingRunId === detail.runId}
              exportResult={
                exportResult?.runId === detail.runId ? exportResult : null
              }
              capsuleExporting={exportingCapsuleRunId === detail.runId}
              capsuleResult={
                capsuleResult?.runId === detail.runId ? capsuleResult : null
              }
              compiling={compilingRunId === detail.runId}
              compiledWorkflowResult={
                compiledWorkflowResult?.runId === detail.runId
                  ? compiledWorkflowResult
                  : null
              }
              onExport={() => handleExport(detail.runId)}
              onCreateCapsule={() => handleCreateCapsule(detail.runId)}
              onCompileWorkflow={() => handleCompileWorkflow(detail.runId)}
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

function RunListItem({
  run,
  selected,
  onSelect,
}: {
  run: ProofPilotRunSummary;
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
            {run.instruction || 'Untitled run'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            <span className="truncate">{formatDate(run.startedAt)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={run.status} />
          <ModeBadge mode={run.mode} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{run.operator}</span>
        <span>{run.eventCount} events</span>
        <span>{run.artifactCount} files</span>
      </div>
    </button>
  );
}

function RunDetail({
  run,
  exporting,
  exportResult,
  capsuleExporting,
  capsuleResult,
  compiling,
  compiledWorkflowResult,
  onExport,
  onCreateCapsule,
  onCompileWorkflow,
}: {
  run: ProofPilotRunDetail;
  exporting: boolean;
  exportResult: ProofPackExportResult | null;
  capsuleExporting: boolean;
  capsuleResult: WorkflowCapsuleExportResult | null;
  compiling: boolean;
  compiledWorkflowResult: CompiledWorkflowExportResult | null;
  onExport: () => void;
  onCreateCapsule: () => void;
  onCompileWorkflow: () => void;
}) {
  const [replayIndex, setReplayIndex] = useState(0);

  useEffect(() => {
    setReplayIndex(0);
  }, [run.runId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold">
                {run.instruction || 'Untitled run'}
              </h2>
              <StatusBadge status={run.status} />
              <ModeBadge mode={run.mode} />
              <IntegrityBadge integrity={run.integrity} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{run.operator}</span>
              <span>{formatDate(run.startedAt)}</span>
              <span>{formatRunDuration(run)}</span>
              <span>{run.storagePath}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-2">
            <div className="grid grid-cols-2 gap-2 text-right text-xs">
              <SummaryNumber label="Events" value={run.eventCount} />
              <SummaryNumber label="Artifacts" value={run.artifactCount} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={exporting}
            >
              <Download
                className={cn('size-4', exporting && 'animate-pulse')}
              />
              Export Proof Pack
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateCapsule}
              disabled={capsuleExporting}
            >
              <PackageCheck
                className={cn('size-4', capsuleExporting && 'animate-pulse')}
              />
              Create Capsule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCompileWorkflow}
              disabled={compiling}
            >
              <Workflow
                className={cn('size-4', compiling && 'animate-pulse')}
              />
              Compile Workflow
            </Button>
          </div>
        </div>
        {run.integrity.failureReason && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {run.integrity.failureReason}
          </div>
        )}
        {exportResult && (
          <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Exported: </span>
            <span className="break-all">{exportResult.htmlPath}</span>
            {exportResult.openError && (
              <span className="block pt-1 text-amber-700">
                Open failed: {exportResult.openError}
              </span>
            )}
          </div>
        )}
        {capsuleResult && (
          <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Capsule: </span>
            <span className="break-all">{capsuleResult.capsulePath}</span>
            <span className="block pt-1">
              {capsuleResult.stepCount} workflow steps captured.
            </span>
          </div>
        )}
        {compiledWorkflowResult && (
          <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Workflow: </span>
            <span className="break-all">
              {compiledWorkflowResult.workflowPath}
            </span>
            <span className="block pt-1">
              {compiledWorkflowResult.stepCount} compiled steps ready for
              simulation.
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          <ReplayPanel
            events={run.events}
            currentIndex={replayIndex}
            onIndexChange={setReplayIndex}
          />
          <div className="mt-6 space-y-0">
            {run.events.map((event) => (
              <TimelineEvent key={event.id} event={event} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ReplayPanel({
  events,
  currentIndex,
  onIndexChange,
}: {
  events: ProofPilotEvent[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}) {
  const event = events[currentIndex];
  const eventCount = events.length;
  const artifacts = event ? getArtifacts(event.payload) : [];
  const previewArtifact = artifacts[0];
  const rows = event ? getEventRows(event).slice(0, 6) : [];
  const progress =
    eventCount > 1 ? Math.round((currentIndex / (eventCount - 1)) * 100) : 100;

  if (!event) {
    return (
      <section className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No replay events available.
      </section>
    );
  }

  return (
    <section className="rounded-md border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Step {currentIndex + 1} / {eventCount}
            </Badge>
            <span className="text-sm font-medium">
              {eventLabels[event.type]}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDate(event.timestamp)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onIndexChange(Math.min(eventCount - 1, currentIndex + 1))
            }
            disabled={currentIndex >= eventCount - 1}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 text-sm md:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                {row.label}
              </div>
              <div
                className={cn(
                  'min-w-0 whitespace-pre-wrap break-words text-foreground',
                  row.label.includes('Hash') && 'break-all font-mono text-xs',
                )}
              >
                {row.value}
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0">
          {previewArtifact?.dataUrl ? (
            <img
              src={previewArtifact.dataUrl}
              alt={previewArtifact.kind ?? 'replay frame'}
              className="max-h-72 w-full rounded-md border bg-black object-contain"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed bg-background text-sm text-muted-foreground">
              No visual frame for this step
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryNumber({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-md border px-3 py-2">
      <div className="text-base font-semibold leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}

function TimelineEvent({ event }: { event: ProofPilotEvent }) {
  const payload = event.payload;
  const rows = getEventRows(event);
  const artifacts = getArtifacts(payload);
  const Icon = getEventIcon(event.type);

  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <div className="flex size-8 items-center justify-center rounded-full border bg-background">
          <Icon className="size-4" />
        </div>
        <div className="min-h-6 flex-1 border-l" />
      </div>
      <div className="min-w-0 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">{eventLabels[event.type]}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(event.timestamp)}
          </div>
        </div>
        {rows.length > 0 && (
          <div className="mt-3 grid gap-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 text-sm md:grid-cols-[7rem_minmax(0,1fr)]"
              >
                <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  {row.label}
                </div>
                <div
                  className={cn(
                    'min-w-0 whitespace-pre-wrap break-words text-foreground',
                    row.label.includes('Hash') && 'break-all font-mono text-xs',
                  )}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        )}
        {artifacts.length > 0 && <ArtifactGrid artifacts={artifacts} />}
      </div>
    </div>
  );
}

function ArtifactGrid({ artifacts }: { artifacts: ArtifactPreview[] }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {artifacts.map((artifact) => (
        <div key={artifact.id} className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Camera className="size-3.5" />
              {artifact.kind === 'som_screenshot'
                ? 'SoM screenshot'
                : 'Screenshot'}
            </span>
            <span>{formatBytes(artifact.bytes)}</span>
          </div>
          {artifact.dataUrl ? (
            <img
              src={artifact.dataUrl}
              alt={artifact.kind ?? 'screenshot'}
              className="max-h-72 w-full rounded-md border bg-black object-contain"
            />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
              {artifact.missing ? 'Artifact missing' : artifact.relativePath}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: StatusEnum }) {
  return (
    <Badge
      variant="outline"
      className={cn('capitalize', getStatusClass(status))}
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}

function ModeBadge({ mode }: { mode?: string }) {
  if (mode !== 'simulation') {
    return null;
  }

  return (
    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
      <FlaskConical className="size-3" />
      Simulation
    </Badge>
  );
}

function IntegrityBadge({
  integrity,
}: {
  integrity: ProofPilotRunDetail['integrity'];
}) {
  const label =
    integrity.status === 'verified'
      ? 'Verified'
      : integrity.status === 'legacy'
        ? 'Legacy'
        : 'Integrity failed';

  return (
    <Badge
      variant="outline"
      className={cn('capitalize', getIntegrityClass(integrity.status))}
    >
      {label}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed px-6 text-center">
      <FileClock className="size-8 text-muted-foreground" />
      <div className="mt-3 text-sm font-medium">No recorded runs</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Start an agent run to create a proof trail.
      </div>
    </div>
  );
}

function NoSelectionState() {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center">
      <ShieldCheck className="size-9 text-muted-foreground" />
      <div className="mt-3 text-sm font-medium">Select a recorded run</div>
      <div className="mt-1 text-xs text-muted-foreground">
        The timeline will show captured conversations, planned actions, and
        screenshots.
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-9 text-destructive" />
      <div className="max-w-md text-sm text-muted-foreground">{message}</div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
}

function RunListSkeleton() {
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

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="h-20 animate-pulse rounded-md border bg-muted" />
      <div className="h-24 animate-pulse rounded-md border bg-muted" />
      <div className="h-24 animate-pulse rounded-md border bg-muted" />
    </div>
  );
}

function getEventRows(event: ProofPilotEvent): Array<{
  label: string;
  value: string;
}> {
  const payload = event.payload;
  const integrityRows: Array<[string, string | undefined]> = [
    ['Event Hash', event.eventHash],
    [
      'Previous Hash',
      event.eventHash ? (event.previousHash ?? 'Start of chain') : undefined,
    ],
  ];

  switch (event.type) {
    case 'run_started':
      return compactRows([
        ['Instruction', readString(payload.instruction)],
        ['Mode', readString(payload.mode)],
        ['Operator', readString(payload.operator)],
        ['Model', joinParts(payload.modelProvider, payload.modelName)],
        ...integrityRows,
      ]);
    case 'status_changed':
      return compactRows([
        ['Status', readString(payload.status)],
        ...integrityRows,
      ]);
    case 'conversation_added':
      return compactRows([
        ['From', formatConversationFrom(payload.from)],
        ['Message', formatMessageValue(payload.value)],
        ['Timing', formatTiming(payload.timing)],
        ['Actions', readString(payload.actionCount)],
        ...integrityRows,
      ]);
    case 'action_planned':
    case 'simulation_action_skipped':
      return compactRows([
        ['Action', readString(payload.actionType)],
        ['Thought', readString(payload.thought)],
        ['Reflection', readString(payload.reflection)],
        ['Inputs', formatJson(payload.actionInputs)],
        ...integrityRows,
      ]);
    case 'run_error':
      return compactRows([
        ['Error', formatErrorPayload(payload.error)],
        ...integrityRows,
      ]);
    case 'run_finished':
      return compactRows([
        ['Status', readString(payload.status)],
        ...integrityRows,
      ]);
    default:
      return [];
  }
}

function getEventIcon(type: ProofPilotEvent['type']) {
  switch (type) {
    case 'run_started':
      return ShieldCheck;
    case 'status_changed':
      return Activity;
    case 'conversation_added':
      return Bot;
    case 'action_planned':
      return MousePointerClick;
    case 'simulation_action_skipped':
      return FlaskConical;
    case 'run_error':
      return AlertTriangle;
    case 'run_finished':
      return CheckCircle2;
    default:
      return CircleDot;
  }
}

function getArtifacts(payload: PayloadRecord): ArtifactPreview[] {
  return [payload.screenshot, payload.somScreenshot].filter(isArtifactPreview);
}

function isArtifactPreview(value: unknown): value is ArtifactPreview {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.relativePath === 'string'
  );
}

function compactRows(rows: Array<[string, string | undefined]>) {
  return rows
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value: value ?? '' }));
}

function formatConversationFrom(value: unknown): string | undefined {
  if (value === 'human') {
    return 'Human';
  }

  if (value === 'gpt') {
    return 'Agent';
  }

  return readString(value);
}

function formatMessageValue(value: unknown): string | undefined {
  const message = readString(value);
  if (message === '<image>') {
    return 'Screenshot input';
  }

  return message;
}

function formatErrorPayload(value: unknown): string | undefined {
  if (isRecord(value)) {
    return readString(value.message) ?? formatJson(value);
  }

  return readString(value);
}

function formatTiming(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const parts = [
    value.start !== undefined && `start ${readString(value.start)}`,
    value.end !== undefined && `end ${readString(value.end)}`,
    value.cost !== undefined && `cost ${readString(value.cost)}`,
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : undefined;
}

function formatJson(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function joinParts(...values: unknown[]): string | undefined {
  const parts = values.map(readString).filter(Boolean);
  return parts.length ? parts.join(' / ') : undefined;
}

function readString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatRunDuration(run: ProofPilotRunDetail | ProofPilotRunSummary) {
  const start = new Date(run.startedAt).getTime();
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Duration unavailable';
  }

  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatBytes(value: unknown): string {
  if (typeof value !== 'number') {
    return '';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
}

function getStatusClass(status: StatusEnum): string {
  switch (status) {
    case StatusEnum.END:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case StatusEnum.RUNNING:
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case StatusEnum.PAUSE:
    case StatusEnum.CALL_USER:
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case StatusEnum.ERROR:
    case StatusEnum.MAX_LOOP:
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
}

function getIntegrityClass(status: ProofPilotRunDetail['integrity']['status']) {
  switch (status) {
    case 'verified':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'legacy':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRecord(value: unknown): value is PayloadRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
