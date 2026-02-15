/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { StatusEnum } from '@ui-tars/shared/types';

import { type AppState } from '@main/store/types';

import { type CheckpointRecoveryService } from './checkpointRecovery';
import { type ReliabilityRendererState } from './reliabilityObservability';

export const mapStatusToRendererState = (
  status: StatusEnum,
): ReliabilityRendererState => {
  if (status === StatusEnum.CALL_USER) {
    return 'blocked';
  }
  if (status === StatusEnum.ERROR) {
    return 'error';
  }
  if (status === StatusEnum.END || status === StatusEnum.USER_STOPPED) {
    return 'completed';
  }
  return 'executing_tool';
};

type RuntimeErrorStateInput = {
  setState: (state: AppState) => void;
  getState: () => AppState;
  checkpointRecovery: Pick<CheckpointRecoveryService, 'updateStatus'>;
  sessionId: string;
  errorMsg: string;
  checkpointErrorMsg?: string;
};

export const applyRuntimeErrorState = ({
  setState,
  getState,
  checkpointRecovery,
  sessionId,
  errorMsg,
  checkpointErrorMsg,
}: RuntimeErrorStateInput): void => {
  setState({
    ...getState(),
    status: StatusEnum.ERROR,
    errorMsg,
  });

  checkpointRecovery.updateStatus({
    sessionId,
    status: StatusEnum.ERROR,
    fsmState: 'error',
    errorMsg: checkpointErrorMsg,
  });
};
