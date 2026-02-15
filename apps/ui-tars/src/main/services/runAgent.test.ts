/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import { StatusEnum } from '@ui-tars/shared/types';
import { applyRuntimeErrorState } from './runAgentRuntime';

describe('runAgent characterization', () => {
  it('characterization red: applies runtime error transition consistently', () => {
    const setState = vi.fn();
    const getState = vi.fn().mockReturnValue({
      status: StatusEnum.RUNNING,
      errorMsg: null,
      messages: [],
      restUserData: null,
      instructions: 'open cursor',
      sessionHistoryMessages: [],
      abortController: null,
      thinking: false,
      browserAvailable: true,
      ensurePermissions: {},
      theme: 'light',
    });
    const checkpointRecovery = {
      updateStatus: vi.fn(),
    };

    applyRuntimeErrorState({
      setState,
      getState,
      checkpointRecovery,
      sessionId: 'session-1',
      errorMsg: JSON.stringify({ message: 'boom' }),
      checkpointErrorMsg: JSON.stringify({ message: 'boom' }),
    });

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: StatusEnum.ERROR,
      }),
    );
    expect(checkpointRecovery.updateStatus).toHaveBeenCalledWith({
      sessionId: 'session-1',
      status: StatusEnum.ERROR,
      fsmState: 'error',
      errorMsg: JSON.stringify({ message: 'boom' }),
    });
  });

  it('invalid transition fails closed to error state', () => {
    const setState = vi.fn();
    const getState = vi.fn().mockReturnValue({
      status: StatusEnum.END,
      errorMsg: null,
      messages: [],
      restUserData: null,
      instructions: 'open cursor',
      sessionHistoryMessages: [],
      abortController: null,
      thinking: false,
      browserAvailable: true,
      ensurePermissions: {},
      theme: 'light',
    });
    const checkpointRecovery = {
      updateStatus: vi.fn(),
    };

    applyRuntimeErrorState({
      setState,
      getState,
      checkpointRecovery,
      sessionId: 'session-2',
      errorMsg: JSON.stringify({ message: 'invalid transition' }),
      checkpointErrorMsg: 'invalid transition',
    });

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: StatusEnum.ERROR,
      }),
    );
    expect(checkpointRecovery.updateStatus).toHaveBeenCalledWith({
      sessionId: 'session-2',
      status: StatusEnum.ERROR,
      fsmState: 'error',
      errorMsg: 'invalid transition',
    });
  });
});
