/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@main/services/runAgent', () => ({
  runAgent: vi.fn(async () => undefined),
}));

vi.mock('@main/window/index', () => ({
  showWindow: vi.fn(),
}));

vi.mock('@main/window/ScreenMarker', () => ({
  closeScreenMarker: vi.fn(),
}));

import { agentRoute } from './agent';
import { store } from '@main/store/create';
import { Message, StatusEnum } from '@ui-tars/shared/types';
import { CheckpointRecoveryService } from '@main/services/checkpointRecovery';
import { ReliabilityObservabilityService } from '@main/services/reliabilityObservability';

describe('agentRoute recovery integration', () => {
  beforeEach(() => {
    store.setState({
      ...store.getInitialState(),
      instructions: '',
      sessionHistoryMessages: [],
      messages: [],
      status: StatusEnum.INIT,
      errorMsg: null,
      thinking: false,
      abortController: null,
    });
    CheckpointRecoveryService.getInstance().resetForTests();
    ReliabilityObservabilityService.getInstance().resetForTests();
  });

  afterEach(() => {
    CheckpointRecoveryService.getInstance().resetForTests();
    ReliabilityObservabilityService.getInstance().resetForTests();
  });

  it('restores instruction/history from recoverable checkpoint after forced crash state', async () => {
    const history: Message[] = [
      { from: 'human', value: 'open cursor' },
      { from: 'gpt', value: 'I will open Cursor now' },
    ];
    const checkpointService = CheckpointRecoveryService.getInstance();

    checkpointService.beginRun({
      sessionId: 'main-crash-1',
      instruction: 'open cursor',
      sessionHistoryMessages: history,
    });
    checkpointService.updateStatus({
      sessionId: 'main-crash-1',
      status: StatusEnum.ERROR,
      fsmState: 'error',
      errorMsg: 'forced crash',
    });

    store.setState({
      ...store.getState(),
      status: StatusEnum.ERROR,
      instructions: '',
      sessionHistoryMessages: [],
      errorMsg: 'forced crash',
    });

    const recoverable = await agentRoute.getRecoveryCheckpoint.handle({
      input: undefined,
      context: {} as never,
    });
    expect(recoverable?.sessionId).toBe('main-crash-1');
    expect(recoverable?.fsmState).toBe('error');

    const result = await agentRoute.recoverFromCheckpoint.handle({
      input: undefined,
      context: {} as never,
    });

    expect(result).toMatchObject({
      sessionId: 'main-crash-1',
      restoredMessageCount: 2,
    });
    expect(store.getState().status).toBe(StatusEnum.INIT);
    expect(store.getState().errorMsg).toBeNull();
    expect(store.getState().instructions).toBe('open cursor');
    expect(store.getState().sessionHistoryMessages).toEqual(history);
  });

  it('invalidates checkpoint when clearHistory is requested', async () => {
    CheckpointRecoveryService.getInstance().beginRun({
      sessionId: 'main-clear-1',
      instruction: 'open settings',
      sessionHistoryMessages: [{ from: 'human', value: 'open settings' }],
    });

    await agentRoute.clearHistory.handle({
      input: undefined,
      context: {} as never,
    });

    const checkpoint = await agentRoute.getRecoveryCheckpoint.handle({
      input: undefined,
      context: {} as never,
    });
    expect(checkpoint).toBeNull();
  });

  it('returns reliability dashboard snapshot and release-gate evaluation', async () => {
    const observability = ReliabilityObservabilityService.getInstance();
    observability.emitEvent({
      type: 'intent.created',
      sessionId: 'session-dashboard',
      intentId: 'intent-dashboard',
    });

    const snapshot = await agentRoute.getReliabilityDashboard.handle({
      input: undefined,
      context: {} as never,
    });

    expect(snapshot.eventCounts['intent.created']).toBe(1);

    const releaseGate = await agentRoute.evaluateReliabilityReleaseGates.handle(
      {
        input: undefined,
        context: {} as never,
      },
    );

    expect(releaseGate.version).toBe('v1');
    expect(Array.isArray(releaseGate.checks)).toBe(true);
  });
});
