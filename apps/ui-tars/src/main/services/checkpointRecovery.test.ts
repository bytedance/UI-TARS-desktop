/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Message, StatusEnum } from '@ui-tars/shared/types';

import {
  CHECKPOINT_VERSION,
  CheckpointRecoveryService,
  buildResumeInputFromCheckpoint,
  deriveRecoveryFsmState,
  isCheckpointValid,
} from './checkpointRecovery';

describe('CheckpointRecoveryService', () => {
  afterEach(() => {
    CheckpointRecoveryService.getInstance().resetForTests();
  });

  it('stores recoverable checkpoint for running session', () => {
    const service = CheckpointRecoveryService.getInstance();
    const history: Message[] = [
      {
        from: 'human',
        value: 'open cursor',
      },
    ];

    const checkpoint = service.beginRun({
      sessionId: 'main-1',
      instruction: 'open cursor',
      sessionHistoryMessages: history,
    });

    expect(checkpoint.version).toBe(CHECKPOINT_VERSION);
    expect(checkpoint.status).toBe(StatusEnum.RUNNING);

    const recoverable = service.getRecoverableCheckpoint();
    expect(recoverable?.sessionId).toBe('main-1');
    expect(recoverable?.sessionHistoryMessages).toEqual(history);
  });

  it('marks completed checkpoint as non-recoverable', () => {
    const service = CheckpointRecoveryService.getInstance();
    service.beginRun({
      sessionId: 'main-2',
      instruction: 'open settings',
      sessionHistoryMessages: [],
    });

    service.updateStatus({
      sessionId: 'main-2',
      status: StatusEnum.END,
      fsmState: deriveRecoveryFsmState(StatusEnum.END),
    });

    expect(service.getRecoverableCheckpoint()).toBeNull();
    expect(service.getCheckpoint()?.fsmState).toBe('completed');
  });

  it('fails closed for invalid checkpoint payloads', () => {
    const invalidCheckpoint = {
      version: 'v2',
      checkpointId: 'cp-1',
      sessionId: 'main-3',
      instruction: '',
      sessionHistoryMessages: [],
      status: StatusEnum.ERROR,
      fsmState: 'error',
      timestamp: Date.now(),
    } as const;

    const invalidAsCheckpoint = invalidCheckpoint as unknown as Parameters<
      typeof isCheckpointValid
    >[0];

    expect(isCheckpointValid(invalidAsCheckpoint)).toBe(false);
    expect(() => buildResumeInputFromCheckpoint(invalidAsCheckpoint)).toThrow(
      '[RECOVERY_CHECKPOINT_INVALID]',
    );
  });
});
