/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { StatusEnum } from '@ui-tars/shared/types';

export const RELIABILITY_EVENT_TYPES = [
  'intent.created',
  'gate.decision',
  'tool.call.started',
  'tool.call.finished',
  'tool.call.failed',
  'checkpoint.saved',
  'recovery.started',
  'recovery.finished',
] as const;

export const RELIABILITY_RENDERER_STATES = [
  'thinking',
  'executing_tool',
  'waiting_external_condition',
  'retrying',
  'blocked',
  'fallback_to_visual',
  'completed',
  'error',
] as const;

export type ReliabilityEventType = (typeof RELIABILITY_EVENT_TYPES)[number];
export type ReliabilityRendererState =
  (typeof RELIABILITY_RENDERER_STATES)[number];

type ReliabilityEvent = {
  type: ReliabilityEventType;
  timestamp: number;
  sessionId?: string;
  intentId?: string;
  callId?: string;
  toolName?: string;
  toolVersion?: string;
  status?: string;
  errorClass?: string;
  reasonCodes?: string[];
};

type RendererStateTransition = {
  state: ReliabilityRendererState;
  timestamp: number;
  sessionId: string;
  reason?: string;
  status?: StatusEnum;
};

type ReleaseGateCheck = {
  name:
    | 'required_events_present'
    | 'tool_call_result_coverage'
    | 'required_tags_present';
  ok: boolean;
  details: string;
};

const MAX_EVENT_HISTORY = 1000;
const MAX_RENDERER_STATE_HISTORY = 500;

const createEventCountMap = (): Record<ReliabilityEventType, number> => {
  return RELIABILITY_EVENT_TYPES.reduce(
    (accumulator, eventType) => {
      accumulator[eventType] = 0;
      return accumulator;
    },
    {} as Record<ReliabilityEventType, number>,
  );
};

const createRendererStateCountMap = (): Record<
  ReliabilityRendererState,
  number
> => {
  return RELIABILITY_RENDERER_STATES.reduce(
    (accumulator, state) => {
      accumulator[state] = 0;
      return accumulator;
    },
    {} as Record<ReliabilityRendererState, number>,
  );
};

type ReleaseGateEvidence = {
  observedEventCounts: Record<ReliabilityEventType, number>;
  startedToolCalls: number;
  resolvedToolCalls: number;
  eventsMissingRequiredTags: number;
};

const createReleaseGateEvidence = (): ReleaseGateEvidence => {
  return {
    observedEventCounts: createEventCountMap(),
    startedToolCalls: 0,
    resolvedToolCalls: 0,
    eventsMissingRequiredTags: 0,
  };
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim().length > 0 ? value : undefined;
};

const ensureReasonCodes = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const reasonCodes = value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return reasonCodes.length > 0 ? reasonCodes : undefined;
};

const hasRequiredCommonTags = (event: ReliabilityEvent): boolean => {
  return (
    typeof event.sessionId === 'string' && event.sessionId.trim().length > 0
  );
};

const hasRequiredTypeSpecificTags = (event: ReliabilityEvent): boolean => {
  if (event.type === 'intent.created') {
    return !!event.intentId;
  }

  if (event.type === 'gate.decision') {
    return !!event.intentId && !!event.status;
  }

  if (
    event.type === 'tool.call.started' ||
    event.type === 'tool.call.finished' ||
    event.type === 'tool.call.failed'
  ) {
    const hasCoreTags =
      !!event.callId &&
      !!event.toolName &&
      !!event.toolVersion &&
      !!event.status;
    if (!hasCoreTags) {
      return false;
    }

    if (event.type === 'tool.call.failed') {
      return !!event.errorClass;
    }

    return true;
  }

  if (event.type === 'checkpoint.saved' || event.type === 'recovery.finished') {
    return !!event.status;
  }

  return true;
};

export class ReliabilityObservabilityService {
  private static instance: ReliabilityObservabilityService;

  private readonly events: ReliabilityEvent[] = [];
  private readonly rendererStateTransitions: RendererStateTransition[] = [];
  private readonly releaseGateEvidenceBySession = new Map<
    string,
    ReleaseGateEvidence
  >();
  private activeReleaseGateSessionId: string | null = null;

  private constructor() {}

  public static getInstance(): ReliabilityObservabilityService {
    if (!ReliabilityObservabilityService.instance) {
      ReliabilityObservabilityService.instance =
        new ReliabilityObservabilityService();
    }

    return ReliabilityObservabilityService.instance;
  }

  public emitEvent(event: {
    type: ReliabilityEventType;
    sessionId?: string;
    intentId?: string;
    callId?: string;
    toolName?: string;
    toolVersion?: string;
    status?: string;
    errorClass?: string;
    reasonCodes?: string[];
  }): void {
    const normalizedSessionId = normalizeOptionalString(event.sessionId);
    const emittedEvent: ReliabilityEvent = {
      type: event.type,
      timestamp: Date.now(),
      sessionId: normalizedSessionId,
      intentId: normalizeOptionalString(event.intentId),
      callId: normalizeOptionalString(event.callId),
      toolName: normalizeOptionalString(event.toolName),
      toolVersion: normalizeOptionalString(event.toolVersion),
      status: normalizeOptionalString(event.status),
      errorClass: normalizeOptionalString(event.errorClass),
      reasonCodes: ensureReasonCodes(event.reasonCodes),
    };

    this.events.push(emittedEvent);

    if (normalizedSessionId) {
      this.activeReleaseGateSessionId = normalizedSessionId;
    }

    const scopedSessionId =
      emittedEvent.sessionId || this.activeReleaseGateSessionId;
    if (scopedSessionId) {
      const scopedEvidence =
        this.getOrCreateReleaseGateEvidence(scopedSessionId);
      scopedEvidence.observedEventCounts[emittedEvent.type] += 1;

      if (emittedEvent.type === 'tool.call.started') {
        scopedEvidence.startedToolCalls += 1;
      }

      if (
        emittedEvent.type === 'tool.call.finished' ||
        emittedEvent.type === 'tool.call.failed'
      ) {
        scopedEvidence.resolvedToolCalls += 1;
      }

      if (
        !hasRequiredCommonTags(emittedEvent) ||
        !hasRequiredTypeSpecificTags(emittedEvent)
      ) {
        scopedEvidence.eventsMissingRequiredTags += 1;
      }
    }

    if (this.events.length > MAX_EVENT_HISTORY) {
      this.events.splice(0, this.events.length - MAX_EVENT_HISTORY);
    }
  }

  public emitRendererState(params: {
    state: ReliabilityRendererState;
    sessionId: string;
    reason?: string;
    status?: StatusEnum;
  }): void {
    this.rendererStateTransitions.push({
      state: params.state,
      timestamp: Date.now(),
      sessionId: normalizeOptionalString(params.sessionId) || 'unknown-session',
      reason: normalizeOptionalString(params.reason),
      status: params.status,
    });

    if (this.rendererStateTransitions.length > MAX_RENDERER_STATE_HISTORY) {
      this.rendererStateTransitions.splice(
        0,
        this.rendererStateTransitions.length - MAX_RENDERER_STATE_HISTORY,
      );
    }
  }

  public getDashboardSnapshot(): {
    generatedAt: number;
    eventCounts: Record<ReliabilityEventType, number>;
    rendererStateCounts: Record<ReliabilityRendererState, number>;
    latestEvents: ReliabilityEvent[];
    latestRendererStates: RendererStateTransition[];
  } {
    const eventCounts = createEventCountMap();
    const rendererStateCounts = createRendererStateCountMap();

    for (const event of this.events) {
      eventCounts[event.type] += 1;
    }

    for (const transition of this.rendererStateTransitions) {
      rendererStateCounts[transition.state] += 1;
    }

    return {
      generatedAt: Date.now(),
      eventCounts,
      rendererStateCounts,
      latestEvents: this.events.slice(-50),
      latestRendererStates: this.rendererStateTransitions.slice(-50),
    };
  }

  public evaluateReleaseGates(sessionId?: string): {
    version: 'v1';
    ok: boolean;
    checkedAt: number;
    checks: ReleaseGateCheck[];
  } {
    const scopedSessionId =
      normalizeOptionalString(sessionId) || this.activeReleaseGateSessionId;
    const scopedEvidence = scopedSessionId
      ? this.releaseGateEvidenceBySession.get(scopedSessionId) ||
        createReleaseGateEvidence()
      : createReleaseGateEvidence();

    const requiredEventTypes: ReliabilityEventType[] = [
      'intent.created',
      'gate.decision',
      'tool.call.started',
      'checkpoint.saved',
      'recovery.started',
      'recovery.finished',
    ];

    const missingRequiredEventTypes = requiredEventTypes.filter(
      (eventType) => scopedEvidence.observedEventCounts[eventType] === 0,
    );

    const hasAnyToolCallResult = scopedEvidence.resolvedToolCalls > 0;

    const startedToolCalls = scopedEvidence.startedToolCalls;
    const resolvedToolCalls = scopedEvidence.resolvedToolCalls;
    const eventsWithMissingTags = scopedEvidence.eventsMissingRequiredTags;

    const checks: ReleaseGateCheck[] = [
      {
        name: 'required_events_present',
        ok: missingRequiredEventTypes.length === 0 && hasAnyToolCallResult,
        details:
          missingRequiredEventTypes.length === 0 && hasAnyToolCallResult
            ? 'all required reliability events observed'
            : [
                missingRequiredEventTypes.length > 0
                  ? `missing events: ${missingRequiredEventTypes.join(', ')}`
                  : null,
                hasAnyToolCallResult
                  ? null
                  : 'missing events: tool.call.result',
              ]
                .filter(Boolean)
                .join('; '),
      },
      {
        name: 'tool_call_result_coverage',
        ok: startedToolCalls > 0 && resolvedToolCalls >= startedToolCalls,
        details:
          startedToolCalls > 0 && resolvedToolCalls >= startedToolCalls
            ? `resolved ${resolvedToolCalls}/${startedToolCalls} tool calls`
            : `resolved ${resolvedToolCalls}/${startedToolCalls} tool calls`,
      },
      {
        name: 'required_tags_present',
        ok: eventsWithMissingTags === 0,
        details:
          eventsWithMissingTags === 0
            ? 'all required event tags present'
            : `events missing required tags: ${eventsWithMissingTags}`,
      },
    ];

    return {
      version: 'v1',
      ok: checks.every((check) => check.ok),
      checkedAt: Date.now(),
      checks,
    };
  }

  public resetForTests(): void {
    this.events.splice(0, this.events.length);
    this.rendererStateTransitions.splice(
      0,
      this.rendererStateTransitions.length,
    );
    this.releaseGateEvidenceBySession.clear();
    this.activeReleaseGateSessionId = null;
  }

  private getOrCreateReleaseGateEvidence(
    sessionId: string,
  ): ReleaseGateEvidence {
    const existingEvidence = this.releaseGateEvidenceBySession.get(sessionId);
    if (existingEvidence) {
      return existingEvidence;
    }

    const createdEvidence = createReleaseGateEvidence();
    this.releaseGateEvidenceBySession.set(sessionId, createdEvidence);
    return createdEvidence;
  }
}
