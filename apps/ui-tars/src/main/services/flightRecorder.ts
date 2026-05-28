/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  writeFile,
  appendFile,
  readFile,
  readdir,
  copyFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  GUIAgentData,
  StatusEnum,
  type PredictionParsed,
} from '@ui-tars/shared/types';
import { ConversationWithSoM } from '@main/shared/types';
import { Operator } from '@main/store/types';

const require = createRequire(import.meta.url);

type FlightRecorderEventType =
  | 'run_started'
  | 'status_changed'
  | 'conversation_added'
  | 'action_planned'
  | 'simulation_action_skipped'
  | 'run_error'
  | 'run_finished';

type FlightRecorderRunMode = 'live' | 'simulation';

type FlightRecorderRunContext = {
  sessionId?: string | null;
  mode?: FlightRecorderRunMode;
  instruction: string;
  operator: Operator;
  modelName?: string;
  modelProvider?: string;
};

type FlightRecorderArtifact = {
  id: string;
  kind: 'screenshot' | 'som_screenshot';
  relativePath: string;
  sha256: string;
  bytes: number;
  mime: string;
  createdAt: string;
};

type FlightRecorderArtifactPreview = FlightRecorderArtifact & {
  dataUrl?: string;
  missing?: boolean;
};

type FlightRecorderIntegrity = {
  algorithm: 'sha256';
  status: 'verified' | 'failed' | 'legacy';
  valid: boolean;
  eventCount: number;
  verifiedEventCount: number;
  recordingHash?: string;
  expectedRecordingHash?: string;
  failureSequence?: number;
  failureReason?: string;
};

type FlightRecorderManifest = {
  version: 1;
  runId: string;
  sessionId?: string;
  mode: FlightRecorderRunMode;
  instruction: string;
  operator: Operator;
  modelName?: string;
  modelProvider?: string;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  status: StatusEnum;
  eventCount: number;
  artifactCount: number;
  integrityAlgorithm?: 'sha256';
  recordingHash?: string;
};

type FlightRecorderEvent = {
  id: string;
  runId: string;
  sequence: number;
  timestamp: string;
  type: FlightRecorderEventType;
  payload: Record<string, unknown>;
  previousHash?: string | null;
  eventHash?: string;
};

type FlightRecorderRunSummary = FlightRecorderManifest & {
  storagePath: string;
};

type FlightRecorderRunDetail = FlightRecorderRunSummary & {
  events: FlightRecorderEvent[];
  integrity: FlightRecorderIntegrity;
};

type ProofPackExport = {
  runId: string;
  exportDirectory: string;
  htmlPath: string;
  jsonPath: string;
  generatedAt: string;
  integrity: FlightRecorderIntegrity;
};

type WorkflowCapsuleStep = {
  id: string;
  sourceEventId: string;
  sourceSequence: number;
  sourceEventHash?: string;
  actionType: string;
  actionInputs: unknown;
  thought?: string;
  reflection?: string;
  sourceConversation?: {
    eventId: string;
    sequence: number;
    timestamp: string;
    from?: string;
    message?: string;
    screenshot?: unknown;
    somScreenshot?: unknown;
  };
};

type WorkflowCapsule = {
  version: 1;
  generatedAt: string;
  status: 'draft';
  sourceRun: {
    runId: string;
    mode: FlightRecorderRunMode;
    instruction: string;
    operator: Operator;
    modelName?: string;
    modelProvider?: string;
    startedAt: string;
    finishedAt?: string;
    recordingHash?: string;
    integrity: FlightRecorderIntegrity;
  };
  stepCount: number;
  steps: WorkflowCapsuleStep[];
};

type WorkflowCapsuleExport = {
  runId: string;
  capsuleDirectory: string;
  capsulePath: string;
  generatedAt: string;
  stepCount: number;
  integrity: FlightRecorderIntegrity;
};

type CompiledWorkflowInput = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: unknown;
};

type CompiledWorkflowStep = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  actionType: string;
  actionInputs: unknown;
  requiresApproval: boolean;
  retryPolicy: {
    maxAttempts: number;
    onFailure: 'request_human_review';
  };
  evidence: {
    sourceEventId: string;
    sourceSequence: number;
    sourceEventHash?: string;
    screenshot?: unknown;
    somScreenshot?: unknown;
  };
};

type CompiledWorkflow = {
  version: 1;
  kind: 'proofpilot.workflow';
  workflowId: string;
  name: string;
  generatedAt: string;
  status: 'ready_for_simulation';
  sourceRun: WorkflowCapsule['sourceRun'];
  inputs: CompiledWorkflowInput[];
  guardrails: {
    defaultRunMode: FlightRecorderRunMode;
    requireIntegrityVerification: boolean;
    requireApprovalForRiskyActions: boolean;
    stopConditions: string[];
  };
  stepCount: number;
  steps: CompiledWorkflowStep[];
};

type CompiledWorkflowExport = {
  runId: string;
  workflowDirectory: string;
  workflowPath: string;
  markdownPath: string;
  generatedAt: string;
  workflowId: string;
  stepCount: number;
  integrity: FlightRecorderIntegrity;
};

type FlightRecorderOptions = {
  storageRoot?: string;
  now?: () => Date;
  idFactory?: () => string;
};

class FlightRecorder {
  private static instance?: FlightRecorder;

  private readonly storageRoot: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: FlightRecorderOptions = {}) {
    this.storageRoot = options.storageRoot ?? getDefaultStorageRoot();
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  static getInstance(): FlightRecorder {
    if (!FlightRecorder.instance) {
      FlightRecorder.instance = new FlightRecorder();
    }
    return FlightRecorder.instance;
  }

  async startRun(context: FlightRecorderRunContext): Promise<FlightRecording> {
    const startedAt = this.now();
    const now = startedAt.toISOString();
    const runId = `run_${startedAt.getTime()}_${this.idFactory()}`;
    const runDirectory = path.join(this.storageRoot, runId);
    const manifest: FlightRecorderManifest = {
      version: 1,
      runId,
      sessionId: context.sessionId ?? undefined,
      mode: context.mode ?? 'live',
      instruction: context.instruction,
      operator: context.operator,
      modelName: context.modelName,
      modelProvider: context.modelProvider,
      startedAt: now,
      updatedAt: now,
      status: StatusEnum.INIT,
      eventCount: 0,
      artifactCount: 0,
    };

    await mkdir(path.join(runDirectory, 'screenshots'), { recursive: true });

    const recording = new FlightRecording({
      runDirectory,
      manifest,
      now: this.now,
      idFactory: this.idFactory,
    });
    await recording.writeManifest();
    await recording.appendEvent('run_started', {
      sessionId: context.sessionId,
      mode: context.mode ?? 'live',
      instruction: context.instruction,
      operator: context.operator,
      modelName: context.modelName,
      modelProvider: context.modelProvider,
    });

    return recording;
  }

  async listRuns(): Promise<FlightRecorderRunSummary[]> {
    let entries: Awaited<ReturnType<typeof readdir>>;
    try {
      entries = await readdir(this.storageRoot, { withFileTypes: true });
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }

    const runs = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            const runDirectory = this.resolveRunDirectory(entry.name);
            const manifest = await readManifest(runDirectory);
            return {
              ...manifest,
              storagePath: runDirectory,
            };
          } catch {
            return null;
          }
        }),
    );

    return runs
      .filter(isDefined)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async getRun(runId: string): Promise<FlightRecorderRunDetail | null> {
    const runDirectory = this.resolveRunDirectory(runId);

    try {
      const manifest = await readManifest(runDirectory);
      const events = await readEvents(runDirectory);
      const integrity = validateEventChain(events, manifest);
      const eventsWithPreviews = await Promise.all(
        events.map((event) => this.withArtifactPreviews(runDirectory, event)),
      );

      return {
        ...manifest,
        storagePath: runDirectory,
        events: eventsWithPreviews,
        integrity,
      };
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private resolveRunDirectory(runId: string): string {
    if (!/^[A-Za-z0-9_.-]+$/.test(runId)) {
      throw new Error('Invalid ProofPilot run id');
    }

    return resolveInside(this.storageRoot, runId);
  }

  private async withArtifactPreviews(
    runDirectory: string,
    event: FlightRecorderEvent,
  ): Promise<FlightRecorderEvent> {
    const payload = { ...event.payload };
    payload.screenshot = await this.withArtifactPreview(
      runDirectory,
      payload.screenshot,
    );
    payload.somScreenshot = await this.withArtifactPreview(
      runDirectory,
      payload.somScreenshot,
    );

    return {
      ...event,
      payload,
    };
  }

  private async withArtifactPreview(
    runDirectory: string,
    value: unknown,
  ): Promise<unknown> {
    if (!isArtifact(value)) {
      return value;
    }

    try {
      const artifactPath = resolveInside(runDirectory, value.relativePath);
      const buffer = await readFile(artifactPath);
      return {
        ...value,
        dataUrl: `data:${value.mime};base64,${buffer.toString('base64')}`,
      } satisfies FlightRecorderArtifactPreview;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return {
          ...value,
          missing: true,
        } satisfies FlightRecorderArtifactPreview;
      }

      throw error;
    }
  }

  async exportProofPack(runId: string): Promise<ProofPackExport> {
    const runDirectory = this.resolveRunDirectory(runId);
    const detail = await this.getRun(runId);
    if (!detail) {
      throw new Error('ProofPilot run was not found');
    }

    const generatedAt = this.now().toISOString();
    const exportDirectory = path.join(runDirectory, 'proof-pack');
    const htmlPath = path.join(exportDirectory, 'index.html');
    const jsonPath = path.join(exportDirectory, 'proof-pack.json');
    const exportPayload = stripPreviewData({
      version: 1,
      generatedAt,
      run: {
        ...detail,
        storagePath: undefined,
      },
    });

    await mkdir(exportDirectory, { recursive: true });
    await copyProofPackArtifacts(runDirectory, exportDirectory, detail.events);
    await writeFile(
      jsonPath,
      `${JSON.stringify(exportPayload, null, 2)}\n`,
      'utf8',
    );
    await writeFile(htmlPath, renderProofPackHtml(detail, generatedAt), 'utf8');

    return {
      runId,
      exportDirectory,
      htmlPath,
      jsonPath,
      generatedAt,
      integrity: detail.integrity,
    };
  }

  async exportWorkflowCapsule(runId: string): Promise<WorkflowCapsuleExport> {
    const runDirectory = this.resolveRunDirectory(runId);
    const detail = await this.getRun(runId);
    if (!detail) {
      throw new Error('ProofPilot run was not found');
    }

    const generatedAt = this.now().toISOString();
    const capsule = createWorkflowCapsule(detail, generatedAt);
    const capsuleDirectory = path.join(runDirectory, 'workflow-capsule');
    const capsulePath = path.join(capsuleDirectory, 'workflow-capsule.json');

    await mkdir(capsuleDirectory, { recursive: true });
    await writeFile(
      capsulePath,
      `${JSON.stringify(stripPreviewData(capsule), null, 2)}\n`,
      'utf8',
    );

    return {
      runId,
      capsuleDirectory,
      capsulePath,
      generatedAt,
      stepCount: capsule.stepCount,
      integrity: detail.integrity,
    };
  }

  async compileWorkflow(runId: string): Promise<CompiledWorkflowExport> {
    const runDirectory = this.resolveRunDirectory(runId);
    const detail = await this.getRun(runId);
    if (!detail) {
      throw new Error('ProofPilot run was not found');
    }

    const generatedAt = this.now().toISOString();
    const workflow = createCompiledWorkflow(detail, generatedAt);
    const workflowDirectory = path.join(runDirectory, 'compiled-workflow');
    const workflowPath = path.join(workflowDirectory, 'workflow.json');
    const markdownPath = path.join(workflowDirectory, 'workflow.md');

    await mkdir(workflowDirectory, { recursive: true });
    await writeFile(
      workflowPath,
      `${JSON.stringify(stripPreviewData(workflow), null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      markdownPath,
      renderCompiledWorkflowMarkdown(workflow),
      'utf8',
    );

    return {
      runId,
      workflowDirectory,
      workflowPath,
      markdownPath,
      generatedAt,
      workflowId: workflow.workflowId,
      stepCount: workflow.stepCount,
      integrity: detail.integrity,
    };
  }
}

class FlightRecording {
  private readonly runDirectory: string;
  private readonly eventLogPath: string;
  private readonly manifestPath: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private manifest: FlightRecorderManifest;
  private sequence = 0;
  private previousHash: string | null = null;
  private lastStatus?: StatusEnum;
  private seenConversationKeys = new Set<string>();

  constructor(options: {
    runDirectory: string;
    manifest: FlightRecorderManifest;
    now: () => Date;
    idFactory: () => string;
  }) {
    this.runDirectory = options.runDirectory;
    this.eventLogPath = path.join(this.runDirectory, 'events.jsonl');
    this.manifestPath = path.join(this.runDirectory, 'manifest.json');
    this.manifest = options.manifest;
    this.now = options.now;
    this.idFactory = options.idFactory;
  }

  get runId(): string {
    return this.manifest.runId;
  }

  get directory(): string {
    return this.runDirectory;
  }

  async recordAgentData(data: GUIAgentData): Promise<void> {
    if (data.status !== this.lastStatus) {
      this.lastStatus = data.status;
      this.manifest.status = data.status;
      await this.appendEvent('status_changed', { status: data.status });
    }

    for (const conversation of data.conversations ?? []) {
      await this.recordConversation(conversation as ConversationWithSoM);
    }
  }

  async recordError(error: unknown): Promise<void> {
    await this.appendEvent('run_error', {
      error: serializeError(error),
    });
  }

  async recordSimulationActionSkipped(action: PredictionParsed): Promise<void> {
    await this.appendEvent('simulation_action_skipped', {
      actionType: action.action_type,
      actionInputs: action.action_inputs,
      thought: action.thought,
      reflection: action.reflection,
    });
  }

  async finish(status: StatusEnum): Promise<void> {
    const now = this.now().toISOString();
    this.manifest.status = status;
    this.manifest.finishedAt = now;
    this.manifest.updatedAt = now;
    await this.appendEvent('run_finished', { status });
  }

  async writeManifest(): Promise<void> {
    await writeFile(
      this.manifestPath,
      `${JSON.stringify(this.manifest, null, 2)}\n`,
      'utf8',
    );
  }

  async appendEvent(
    type: FlightRecorderEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.sequence += 1;
    const timestamp = this.now().toISOString();
    const eventWithoutHash: Omit<FlightRecorderEvent, 'eventHash'> = {
      id: this.idFactory(),
      runId: this.manifest.runId,
      sequence: this.sequence,
      timestamp,
      type,
      payload,
      previousHash: this.previousHash,
    };
    const eventHash = createEventHash(eventWithoutHash);
    const event: FlightRecorderEvent = {
      ...eventWithoutHash,
      eventHash,
    };

    await appendFile(this.eventLogPath, `${JSON.stringify(event)}\n`, 'utf8');
    this.previousHash = eventHash;
    this.manifest.eventCount = this.sequence;
    this.manifest.updatedAt = timestamp;
    this.manifest.integrityAlgorithm = 'sha256';
    this.manifest.recordingHash = eventHash;
    await this.writeManifest();
  }

  private async recordConversation(
    conversation: ConversationWithSoM,
  ): Promise<void> {
    const key = createConversationKey(conversation);
    if (this.seenConversationKeys.has(key)) {
      return;
    }
    this.seenConversationKeys.add(key);

    const screenshot = await this.persistScreenshot(
      conversation.screenshotBase64,
      'screenshot',
    );
    const somScreenshot = await this.persistScreenshot(
      conversation.screenshotBase64WithElementMarker,
      'som_screenshot',
    );

    await this.appendEvent('conversation_added', {
      from: conversation.from,
      value: conversation.value,
      timing: conversation.timing,
      screenshotContext: conversation.screenshotContext,
      screenshot,
      somScreenshot,
      actionCount: conversation.predictionParsed?.length ?? 0,
    });

    for (const [index, action] of (
      conversation.predictionParsed ?? []
    ).entries()) {
      await this.appendEvent('action_planned', {
        index,
        actionType: action.action_type,
        actionInputs: action.action_inputs,
        thought: action.thought,
        reflection: action.reflection,
      });
    }
  }

  private async persistScreenshot(
    base64: string | undefined,
    kind: FlightRecorderArtifact['kind'],
  ): Promise<FlightRecorderArtifact | undefined> {
    if (!base64) {
      return undefined;
    }

    const mime = readMime(base64);
    const extension = mime === 'image/jpeg' ? 'jpg' : 'png';
    const buffer = Buffer.from(stripDataUrlPrefix(base64), 'base64');
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const id = `${kind}_${sha256.slice(0, 16)}`;
    const relativePath = path.join('screenshots', `${id}.${extension}`);
    const artifact: FlightRecorderArtifact = {
      id,
      kind,
      relativePath,
      sha256,
      bytes: buffer.byteLength,
      mime,
      createdAt: this.now().toISOString(),
    };

    await writeFile(path.join(this.runDirectory, relativePath), buffer);
    this.manifest.artifactCount += 1;
    return artifact;
  }
}

function getDefaultStorageRoot(): string {
  const { app } = require('electron') as typeof import('electron');
  return path.join(app.getPath('userData'), 'proofpilot', 'flight-records');
}

function createConversationKey(conversation: ConversationWithSoM): string {
  return [
    conversation.from,
    conversation.value,
    conversation.timing?.start,
    conversation.timing?.end,
    conversation.predictionParsed
      ?.map((prediction) => prediction.action_type)
      .join(','),
  ].join(':');
}

function stripDataUrlPrefix(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

function readMime(base64: string): string {
  const match = /^data:(image\/\w+);base64,/.exec(base64);
  return match?.[1] ?? 'image/png';
}

async function readManifest(
  runDirectory: string,
): Promise<FlightRecorderManifest> {
  const manifest = await readFile(
    path.join(runDirectory, 'manifest.json'),
    'utf8',
  );
  const parsedManifest = JSON.parse(
    manifest,
  ) as Partial<FlightRecorderManifest>;
  return {
    ...parsedManifest,
    mode: parsedManifest.mode ?? 'live',
  } as FlightRecorderManifest;
}

async function readEvents(
  runDirectory: string,
): Promise<FlightRecorderEvent[]> {
  try {
    const eventLog = await readFile(
      path.join(runDirectory, 'events.jsonl'),
      'utf8',
    );

    return eventLog
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as FlightRecorderEvent);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function validateEventChain(
  events: FlightRecorderEvent[],
  manifest: FlightRecorderManifest,
): FlightRecorderIntegrity {
  let previousHash: string | null = null;

  if (manifest.eventCount !== events.length) {
    return {
      algorithm: 'sha256',
      status: 'failed',
      valid: false,
      eventCount: events.length,
      verifiedEventCount: 0,
      recordingHash: manifest.recordingHash,
      failureReason: `Manifest event count ${manifest.eventCount} does not match event log count ${events.length}`,
    };
  }

  for (const event of events) {
    if (!event.eventHash || event.previousHash === undefined) {
      return {
        algorithm: 'sha256',
        status: 'legacy',
        valid: false,
        eventCount: events.length,
        verifiedEventCount: event.sequence - 1,
        recordingHash: manifest.recordingHash,
        failureSequence: event.sequence,
        failureReason: 'This run was recorded before event hashing existed.',
      };
    }

    if (event.previousHash !== previousHash) {
      return {
        algorithm: 'sha256',
        status: 'failed',
        valid: false,
        eventCount: events.length,
        verifiedEventCount: event.sequence - 1,
        recordingHash: manifest.recordingHash,
        failureSequence: event.sequence,
        failureReason: 'Previous event hash does not match the chain.',
      };
    }

    const { eventHash: _eventHash, ...eventWithoutHash } = event;
    const expectedHash = createEventHash(eventWithoutHash);
    if (event.eventHash !== expectedHash) {
      return {
        algorithm: 'sha256',
        status: 'failed',
        valid: false,
        eventCount: events.length,
        verifiedEventCount: event.sequence - 1,
        recordingHash: manifest.recordingHash,
        expectedRecordingHash: expectedHash,
        failureSequence: event.sequence,
        failureReason: 'Event content does not match its recorded hash.',
      };
    }

    previousHash = event.eventHash;
  }

  if (manifest.recordingHash && manifest.recordingHash !== previousHash) {
    return {
      algorithm: 'sha256',
      status: 'failed',
      valid: false,
      eventCount: events.length,
      verifiedEventCount: events.length,
      recordingHash: manifest.recordingHash,
      expectedRecordingHash: previousHash ?? undefined,
      failureReason: 'Manifest recording hash does not match the event chain.',
    };
  }

  return {
    algorithm: 'sha256',
    status: 'verified',
    valid: true,
    eventCount: events.length,
    verifiedEventCount: events.length,
    recordingHash: manifest.recordingHash ?? previousHash ?? undefined,
    expectedRecordingHash: previousHash ?? undefined,
  };
}

function createEventHash(
  event: Omit<FlightRecorderEvent, 'eventHash'>,
): string {
  return createHash('sha256')
    .update(stableStringify(dropJsonUndefined(event)))
    .digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function dropJsonUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function copyProofPackArtifacts(
  runDirectory: string,
  exportDirectory: string,
  events: FlightRecorderEvent[],
): Promise<void> {
  const artifacts = new Map<string, FlightRecorderArtifact>();
  for (const event of events) {
    for (const artifact of getEventArtifacts(event)) {
      artifacts.set(artifact.relativePath, artifact);
    }
  }

  await Promise.all(
    [...artifacts.values()].map(async (artifact) => {
      const sourcePath = resolveInside(runDirectory, artifact.relativePath);
      const exportRelativePath = getProofPackArtifactPath(
        artifact.relativePath,
      );
      const destinationPath = resolveInside(
        exportDirectory,
        exportRelativePath,
      );
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
    }),
  );
}

function getEventArtifacts(
  event: FlightRecorderEvent,
): FlightRecorderArtifact[] {
  return [event.payload.screenshot, event.payload.somScreenshot].filter(
    isArtifact,
  );
}

function getProofPackArtifactPath(relativePath: string): string {
  return path.join('artifacts', relativePath);
}

function getProofPackArtifactUrl(relativePath: string): string {
  return getProofPackArtifactPath(relativePath).split(path.sep).join('/');
}

function stripPreviewData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripPreviewData);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .filter(([key]) => key !== 'dataUrl')
        .map(([key, entryValue]) => [key, stripPreviewData(entryValue)]),
    );
  }

  return value;
}

function createWorkflowCapsule(
  detail: FlightRecorderRunDetail,
  generatedAt: string,
): WorkflowCapsule {
  let lastConversation: FlightRecorderEvent | undefined;
  const steps: WorkflowCapsuleStep[] = [];

  for (const event of detail.events) {
    if (event.type === 'conversation_added') {
      lastConversation = event;
      continue;
    }

    if (event.type !== 'action_planned') {
      continue;
    }

    const stepNumber = steps.length + 1;
    steps.push({
      id: `step_${String(stepNumber).padStart(3, '0')}`,
      sourceEventId: event.id,
      sourceSequence: event.sequence,
      sourceEventHash: event.eventHash,
      actionType: readOptionalString(event.payload.actionType) ?? 'unknown',
      actionInputs: event.payload.actionInputs,
      thought: readOptionalString(event.payload.thought),
      reflection: readOptionalString(event.payload.reflection),
      sourceConversation: lastConversation
        ? {
            eventId: lastConversation.id,
            sequence: lastConversation.sequence,
            timestamp: lastConversation.timestamp,
            from: readOptionalString(lastConversation.payload.from),
            message: readOptionalString(lastConversation.payload.value),
            screenshot: lastConversation.payload.screenshot,
            somScreenshot: lastConversation.payload.somScreenshot,
          }
        : undefined,
    });
  }

  return {
    version: 1,
    generatedAt,
    status: 'draft',
    sourceRun: {
      runId: detail.runId,
      mode: detail.mode,
      instruction: detail.instruction,
      operator: detail.operator,
      modelName: detail.modelName,
      modelProvider: detail.modelProvider,
      startedAt: detail.startedAt,
      finishedAt: detail.finishedAt,
      recordingHash: detail.integrity.recordingHash,
      integrity: detail.integrity,
    },
    stepCount: steps.length,
    steps,
  };
}

function createCompiledWorkflow(
  detail: FlightRecorderRunDetail,
  generatedAt: string,
): CompiledWorkflow {
  const capsule = createWorkflowCapsule(detail, generatedAt);
  const workflowId = createWorkflowId(detail, capsule.steps);
  const steps = capsule.steps.map((step, index) =>
    compileWorkflowStep(step, index),
  );

  return {
    version: 1,
    kind: 'proofpilot.workflow',
    workflowId,
    name: createWorkflowName(detail.instruction),
    generatedAt,
    status: 'ready_for_simulation',
    sourceRun: capsule.sourceRun,
    inputs: [
      {
        key: 'task',
        label: 'Task',
        type: 'text',
        required: true,
        defaultValue: detail.instruction,
      },
    ],
    guardrails: {
      defaultRunMode: 'simulation',
      requireIntegrityVerification: true,
      requireApprovalForRiskyActions: true,
      stopConditions: [
        'Source integrity check fails before execution.',
        'Screen state does not match the expected workflow context.',
        'A risky action is denied or left unapproved.',
        'The agent requests human input.',
      ],
    },
    stepCount: steps.length,
    steps,
  };
}

function compileWorkflowStep(
  step: WorkflowCapsuleStep,
  index: number,
): CompiledWorkflowStep {
  const actionType = step.actionType || 'unknown';
  return {
    id: step.id,
    order: index + 1,
    title: createStepTitle(actionType, index + 1),
    instruction:
      step.thought ||
      step.sourceConversation?.message ||
      `Perform ${actionType}.`,
    actionType,
    actionInputs: step.actionInputs,
    requiresApproval: isRiskyWorkflowAction(actionType, step.actionInputs),
    retryPolicy: {
      maxAttempts: 1,
      onFailure: 'request_human_review',
    },
    evidence: {
      sourceEventId: step.sourceEventId,
      sourceSequence: step.sourceSequence,
      sourceEventHash: step.sourceEventHash,
      screenshot: step.sourceConversation?.screenshot,
      somScreenshot: step.sourceConversation?.somScreenshot,
    },
  };
}

function renderCompiledWorkflowMarkdown(workflow: CompiledWorkflow): string {
  const stepsMarkdown = workflow.steps
    .map((step) =>
      [
        `## ${step.order}. ${step.title}`,
        '',
        `- Instruction: ${step.instruction}`,
        `- Action: ${step.actionType}`,
        `- Approval required: ${step.requiresApproval ? 'yes' : 'no'}`,
        `- Source event: ${step.evidence.sourceSequence}`,
        step.evidence.sourceEventHash
          ? `- Event hash: ${step.evidence.sourceEventHash}`
          : undefined,
        '- Inputs:',
        codeFence(formatUnknown(step.actionInputs) ?? '{}', 'json'),
      ]
        .filter(isDefined)
        .join('\n'),
    )
    .join('\n\n');

  return [
    `# ${workflow.name}`,
    '',
    `Workflow ID: ${workflow.workflowId}`,
    `Generated: ${workflow.generatedAt}`,
    `Source run: ${workflow.sourceRun.runId}`,
    `Integrity: ${workflow.sourceRun.integrity.status}`,
    '',
    '## Guardrails',
    '',
    `- Default run mode: ${workflow.guardrails.defaultRunMode}`,
    `- Integrity verification: ${workflow.guardrails.requireIntegrityVerification ? 'required' : 'optional'}`,
    `- Approval for risky actions: ${workflow.guardrails.requireApprovalForRiskyActions ? 'required' : 'optional'}`,
    ...workflow.guardrails.stopConditions.map((condition) => `- ${condition}`),
    '',
    stepsMarkdown || 'No executable steps were found in this run.',
    '',
  ].join('\n');
}

function createWorkflowId(
  detail: FlightRecorderRunDetail,
  steps: WorkflowCapsuleStep[],
): string {
  return createHash('sha256')
    .update(
      stableStringify({
        runId: detail.runId,
        recordingHash: detail.integrity.recordingHash,
        steps: steps.map((step) => step.sourceEventHash ?? step.sourceEventId),
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

function createWorkflowName(instruction: string): string {
  const normalized = instruction.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return 'Untitled workflow';
  }

  return normalized.length > 80
    ? `${normalized.slice(0, 77).trimEnd()}...`
    : normalized;
}

function createStepTitle(actionType: string, order: number): string {
  const label = actionType.replace(/_/g, ' ');
  return `Step ${order}: ${label}`;
}

function isRiskyWorkflowAction(actionType: string, inputs: unknown): boolean {
  const action = actionType.toLowerCase();
  const serializedInputs = formatUnknown(inputs)?.toLowerCase() ?? '';

  return (
    action.includes('click') ||
    action.includes('drag') ||
    action.includes('type') ||
    action.includes('key') ||
    serializedInputs.includes('delete') ||
    serializedInputs.includes('submit') ||
    serializedInputs.includes('send') ||
    serializedInputs.includes('pay') ||
    serializedInputs.includes('purchase')
  );
}

function codeFence(value: string, language: string): string {
  return `\`\`\`${language}\n${value}\n\`\`\``;
}

function renderProofPackHtml(
  detail: FlightRecorderRunDetail,
  generatedAt: string,
): string {
  const eventsHtml = detail.events.map(renderProofPackEventHtml).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ProofPilot Proof Pack - ${escapeHtml(detail.runId)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f8fafc; }
    body { margin: 0; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 24px 56px; }
    header { border: 1px solid #e5e7eb; background: #ffffff; border-radius: 8px; padding: 24px; }
    h1 { margin: 0; font-size: 24px; line-height: 1.25; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    .muted { color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 20px; }
    .metric { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f8fafc; }
    .metric span { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; }
    .metric strong { font-size: 14px; overflow-wrap: anywhere; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid #d1d5db; padding: 4px 10px; font-size: 12px; font-weight: 600; }
    .badge.verified { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
    .badge.failed { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
    .badge.legacy { color: #92400e; background: #fffbeb; border-color: #fde68a; }
    .timeline { margin-top: 20px; display: grid; gap: 14px; }
    .event { border: 1px solid #e5e7eb; background: #ffffff; border-radius: 8px; padding: 18px; }
    .event-title { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; margin-bottom: 12px; }
    .rows { display: grid; gap: 8px; }
    .row { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 12px; font-size: 14px; }
    .row-label { color: #64748b; font-size: 12px; text-transform: uppercase; }
    .row-value { white-space: pre-wrap; overflow-wrap: anywhere; }
    .hash { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; }
    .artifacts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 14px; }
    figure { margin: 0; }
    figcaption { font-size: 12px; color: #64748b; margin-bottom: 6px; }
    img { max-width: 100%; max-height: 360px; object-fit: contain; background: #020617; border: 1px solid #e5e7eb; border-radius: 8px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="event-title">
        <div>
          <h1>${escapeHtml(detail.instruction || 'Untitled run')}</h1>
          <div class="muted">${escapeHtml(detail.mode)} | ${escapeHtml(detail.operator)} | ${escapeHtml(detail.status)} | ${escapeHtml(detail.runId)}</div>
        </div>
        ${renderIntegrityBadge(detail.integrity)}
      </div>
      <div class="grid">
        <div class="metric"><span>Started</span><strong>${escapeHtml(detail.startedAt)}</strong></div>
        <div class="metric"><span>Finished</span><strong>${escapeHtml(detail.finishedAt ?? 'Not finished')}</strong></div>
        <div class="metric"><span>Generated</span><strong>${escapeHtml(generatedAt)}</strong></div>
        <div class="metric"><span>Mode</span><strong>${escapeHtml(detail.mode)}</strong></div>
        <div class="metric"><span>Events</span><strong>${detail.eventCount}</strong></div>
        <div class="metric"><span>Artifacts</span><strong>${detail.artifactCount}</strong></div>
        <div class="metric"><span>Recording Hash</span><strong class="hash">${escapeHtml(detail.integrity.recordingHash ?? 'Unavailable')}</strong></div>
      </div>
    </header>
    <section class="timeline">
      ${eventsHtml}
    </section>
  </main>
</body>
</html>
`;
}

function renderProofPackEventHtml(event: FlightRecorderEvent): string {
  const rows = getProofPackRows(event)
    .map(
      ([label, value]) => `<div class="row">
        <div class="row-label">${escapeHtml(label)}</div>
        <div class="row-value${label.includes('Hash') ? ' hash' : ''}">${escapeHtml(value)}</div>
      </div>`,
    )
    .join('\n');
  const artifacts = getEventArtifacts(event);
  const artifactsHtml = artifacts.length
    ? `<div class="artifacts">${artifacts
        .map(
          (artifact) => `<figure>
            <figcaption>${escapeHtml(artifact.kind)} | ${escapeHtml(artifact.relativePath)}</figcaption>
            <img src="${escapeHtml(getProofPackArtifactUrl(artifact.relativePath))}" alt="${escapeHtml(artifact.kind)}" />
          </figure>`,
        )
        .join('\n')}</div>`
    : '';

  return `<article class="event">
    <div class="event-title">
      <h2>${escapeHtml(getEventTitle(event.type))}</h2>
      <div class="muted">${escapeHtml(event.timestamp)}</div>
    </div>
    <div class="rows">${rows}</div>
    ${artifactsHtml}
  </article>`;
}

function getProofPackRows(event: FlightRecorderEvent): Array<[string, string]> {
  const payload = event.payload;
  const rows: Array<[string, string | undefined]> = [
    ['Sequence', String(event.sequence)],
    ['Event Hash', event.eventHash],
    ['Previous Hash', event.previousHash ?? 'Start of chain'],
  ];

  switch (event.type) {
    case 'run_started':
      rows.push(
        ['Instruction', readOptionalString(payload.instruction)],
        ['Mode', readOptionalString(payload.mode)],
        ['Operator', readOptionalString(payload.operator)],
        ['Model', joinOptionalParts(payload.modelProvider, payload.modelName)],
      );
      break;
    case 'status_changed':
    case 'run_finished':
      rows.push(['Status', readOptionalString(payload.status)]);
      break;
    case 'conversation_added':
      rows.push(
        ['From', readOptionalString(payload.from)],
        ['Message', readOptionalString(payload.value)],
        ['Timing', formatUnknown(payload.timing)],
        ['Action Count', readOptionalString(payload.actionCount)],
      );
      break;
    case 'action_planned':
    case 'simulation_action_skipped':
      rows.push(
        ['Action', readOptionalString(payload.actionType)],
        ['Thought', readOptionalString(payload.thought)],
        ['Reflection', readOptionalString(payload.reflection)],
        ['Inputs', formatUnknown(payload.actionInputs)],
      );
      break;
    case 'run_error':
      rows.push(['Error', formatUnknown(payload.error)]);
      break;
  }

  return rows
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => [label, value ?? '']);
}

function getEventTitle(type: FlightRecorderEventType): string {
  switch (type) {
    case 'run_started':
      return 'Run started';
    case 'status_changed':
      return 'Status changed';
    case 'conversation_added':
      return 'Conversation captured';
    case 'action_planned':
      return 'Action planned';
    case 'simulation_action_skipped':
      return 'Simulation action skipped';
    case 'run_error':
      return 'Run error';
    case 'run_finished':
      return 'Run finished';
  }
}

function renderIntegrityBadge(integrity: FlightRecorderIntegrity): string {
  const label =
    integrity.status === 'verified'
      ? 'Verified'
      : integrity.status === 'legacy'
        ? 'Legacy'
        : 'Failed';
  return `<span class="badge ${integrity.status}">${label}</span>`;
}

function readOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}

function joinOptionalParts(...values: unknown[]): string | undefined {
  const parts = values.map(readOptionalString).filter(Boolean);
  return parts.length ? parts.join(' / ') : undefined;
}

function formatUnknown(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveInside(root: string, ...segments: string[]): string {
  const rootPath = path.resolve(root);
  const resolvedPath = path.resolve(rootPath, ...segments);
  if (
    resolvedPath !== rootPath &&
    !resolvedPath.startsWith(`${rootPath}${path.sep}`)
  ) {
    throw new Error('Path escapes ProofPilot storage root');
  }

  return resolvedPath;
}

function isArtifact(value: unknown): value is FlightRecorderArtifact {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.relativePath === 'string' &&
    typeof value.mime === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

export { FlightRecorder, FlightRecording };
export type {
  CompiledWorkflow,
  CompiledWorkflowExport,
  CompiledWorkflowInput,
  CompiledWorkflowStep,
  FlightRecorderArtifact,
  FlightRecorderArtifactPreview,
  FlightRecorderEvent,
  FlightRecorderIntegrity,
  FlightRecorderManifest,
  FlightRecorderRunContext,
  FlightRecorderRunDetail,
  FlightRecorderRunMode,
  FlightRecorderRunSummary,
  ProofPackExport,
  WorkflowCapsule,
  WorkflowCapsuleExport,
  WorkflowCapsuleStep,
};
