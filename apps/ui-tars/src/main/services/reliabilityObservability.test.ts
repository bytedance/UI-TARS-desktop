/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { StatusEnum } from '@ui-tars/shared/types';

import { ReliabilityObservabilityService } from './reliabilityObservability';

const emitMinimumPassingEvents = (
  observability: ReliabilityObservabilityService,
  sessionId: string,
) => {
  observability.emitEvent({
    type: 'recovery.started',
    sessionId,
    status: StatusEnum.RUNNING,
  });
  observability.emitEvent({
    type: 'intent.created',
    sessionId,
    intentId: `${sessionId}-intent`,
  });
  observability.emitEvent({
    type: 'gate.decision',
    sessionId,
    intentId: `${sessionId}-intent`,
    status: 'allow',
    reasonCodes: [],
  });
  observability.emitEvent({
    type: 'tool.call.started',
    sessionId,
    intentId: `${sessionId}-intent`,
    callId: `${sessionId}-call`,
    toolName: 'app.launch',
    toolVersion: '1.0.0',
    status: 'started',
  });
  observability.emitEvent({
    type: 'tool.call.finished',
    sessionId,
    intentId: `${sessionId}-intent`,
    callId: `${sessionId}-call`,
    toolName: 'app.launch',
    toolVersion: '1.0.0',
    status: 'ok',
    errorClass: 'none',
  });
  observability.emitEvent({
    type: 'checkpoint.saved',
    sessionId,
    status: StatusEnum.RUNNING,
  });
  observability.emitEvent({
    type: 'recovery.finished',
    sessionId,
    status: StatusEnum.END,
  });
};

const emitMinimumPassingEventsWithFailedToolResult = (
  observability: ReliabilityObservabilityService,
  sessionId: string,
) => {
  observability.emitEvent({
    type: 'recovery.started',
    sessionId,
    status: StatusEnum.RUNNING,
  });
  observability.emitEvent({
    type: 'intent.created',
    sessionId,
    intentId: `${sessionId}-intent`,
  });
  observability.emitEvent({
    type: 'gate.decision',
    sessionId,
    intentId: `${sessionId}-intent`,
    status: 'allow',
    reasonCodes: [],
  });
  observability.emitEvent({
    type: 'tool.call.started',
    sessionId,
    intentId: `${sessionId}-intent`,
    callId: `${sessionId}-call`,
    toolName: 'app.launch',
    toolVersion: '1.0.0',
    status: 'started',
  });
  observability.emitEvent({
    type: 'tool.call.failed',
    sessionId,
    intentId: `${sessionId}-intent`,
    callId: `${sessionId}-call`,
    toolName: 'app.launch',
    toolVersion: '1.0.0',
    status: 'error',
    errorClass: 'non_zero_exit',
  });
  observability.emitEvent({
    type: 'checkpoint.saved',
    sessionId,
    status: StatusEnum.RUNNING,
  });
  observability.emitEvent({
    type: 'recovery.finished',
    sessionId,
    status: StatusEnum.ERROR,
  });
};

describe('ReliabilityObservabilityService', () => {
  it('aggregates dashboard counters for events and renderer states', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    observability.emitEvent({
      type: 'intent.created',
      sessionId: 'session-1',
      intentId: 'intent-1',
    });
    observability.emitEvent({
      type: 'gate.decision',
      sessionId: 'session-1',
      intentId: 'intent-1',
      status: 'allow',
      reasonCodes: [],
    });
    observability.emitRendererState({
      state: 'thinking',
      sessionId: 'session-1',
      status: StatusEnum.RUNNING,
    });
    observability.emitRendererState({
      state: 'executing_tool',
      sessionId: 'session-1',
      status: StatusEnum.RUNNING,
    });

    const snapshot = observability.getDashboardSnapshot();

    expect(snapshot.eventCounts['intent.created']).toBe(1);
    expect(snapshot.eventCounts['gate.decision']).toBe(1);
    expect(snapshot.rendererStateCounts.thinking).toBe(1);
    expect(snapshot.rendererStateCounts.executing_tool).toBe(1);
  });

  it('passes release gates when required events and tags are present', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    emitMinimumPassingEvents(observability, 'session-2');

    const evaluation = observability.evaluateReleaseGates();

    expect(evaluation.ok).toBe(true);
    expect(evaluation.checks.every((check) => check.ok)).toBe(true);
  });

  it('fails release gates when required tags are missing', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    observability.emitEvent({
      type: 'recovery.started',
      sessionId: 'session-3',
      status: StatusEnum.RUNNING,
    });
    observability.emitEvent({
      type: 'intent.created',
      sessionId: 'session-3',
      intentId: 'intent-3',
    });
    observability.emitEvent({
      type: 'gate.decision',
      sessionId: 'session-3',
      intentId: 'intent-3',
      status: 'deny',
      reasonCodes: ['action_type_unsupported'],
    });
    observability.emitEvent({
      type: 'tool.call.started',
      sessionId: 'session-3',
      intentId: 'intent-3',
      callId: 'call-3',
      toolName: 'window.focus',
      toolVersion: '1.0.0',
      status: 'started',
    });
    observability.emitEvent({
      type: 'tool.call.failed',
      sessionId: 'session-3',
      intentId: 'intent-3',
      callId: 'call-3',
      toolName: 'window.focus',
      toolVersion: '1.0.0',
      status: 'error',
    });
    observability.emitEvent({
      type: 'checkpoint.saved',
      sessionId: 'session-3',
      status: StatusEnum.ERROR,
    });
    observability.emitEvent({
      type: 'recovery.finished',
      sessionId: 'session-3',
      status: StatusEnum.ERROR,
    });

    const evaluation = observability.evaluateReleaseGates();

    expect(evaluation.ok).toBe(false);
    expect(
      evaluation.checks.find((check) => check.name === 'required_tags_present')
        ?.ok,
    ).toBe(false);
  });

  it('fails release gates when event sessionId is blank', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    emitMinimumPassingEvents(observability, 'session-blank');
    observability.emitEvent({
      type: 'intent.created',
      sessionId: '',
      intentId: 'intent-blank',
    });

    const evaluation = observability.evaluateReleaseGates();

    expect(evaluation.ok).toBe(false);
    expect(
      evaluation.checks.find((check) => check.name === 'required_tags_present')
        ?.ok,
    ).toBe(false);
  });

  it('keeps release-gate evidence after event history eviction', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    emitMinimumPassingEvents(observability, 'session-evict');

    for (let index = 0; index < 1200; index += 1) {
      observability.emitEvent({
        type: 'intent.created',
        sessionId: `session-evict-${index}`,
        intentId: `intent-evict-${index}`,
      });
    }

    const snapshot = observability.getDashboardSnapshot();
    const evaluation = observability.evaluateReleaseGates('session-evict');

    expect(snapshot.eventCounts['recovery.started']).toBe(0);
    expect(evaluation.ok).toBe(true);
    expect(
      evaluation.checks.find(
        (check) => check.name === 'required_events_present',
      )?.ok,
    ).toBe(true);
  });

  it('accepts failed tool calls in required-events gate', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    emitMinimumPassingEventsWithFailedToolResult(
      observability,
      'session-failed',
    );

    const evaluation = observability.evaluateReleaseGates('session-failed');

    expect(evaluation.ok).toBe(true);
    expect(
      evaluation.checks.find(
        (check) => check.name === 'required_events_present',
      )?.ok,
    ).toBe(true);
  });

  it('scopes release-gate evidence to a single run/session', () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.resetForTests();

    emitMinimumPassingEvents(observability, 'session-good');

    observability.emitEvent({
      type: 'recovery.started',
      sessionId: 'session-bad',
      status: StatusEnum.RUNNING,
    });

    const scopedGood = observability.evaluateReleaseGates('session-good');
    const scopedBad = observability.evaluateReleaseGates('session-bad');
    const activeSessionResult = observability.evaluateReleaseGates();

    expect(scopedGood.ok).toBe(true);
    expect(scopedBad.ok).toBe(false);
    expect(activeSessionResult.ok).toBe(false);
  });
});
