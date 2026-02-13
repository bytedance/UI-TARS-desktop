/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Message, StatusEnum } from '@ui-tars/shared/types';

export const CHECKPOINT_VERSION = 'v1' as const;

export type RecoveryFsmState =
  | 'running'
  | 'retrying'
  | 'blocked'
  | 'error'
  | 'completed'
  | 'user_stopped';

export type RecoveryCheckpointV1 = {
  version: typeof CHECKPOINT_VERSION;
  checkpointId: string;
  sessionId: string;
  instruction: string;
  sessionHistoryMessages: Message[];
  status: StatusEnum;
  fsmState: RecoveryFsmState;
  timestamp: number;
  errorMsg?: string;
};

type BeginRunParams = {
  sessionId: string;
  instruction: string;
  sessionHistoryMessages: Message[];
};

type UpdateStatusParams = {
  sessionId: string;
  status: StatusEnum;
  fsmState: RecoveryFsmState;
  errorMsg?: string;
};

const isRecoverableFsmState = (fsmState: RecoveryFsmState): boolean =>
  fsmState === 'running' ||
  fsmState === 'retrying' ||
  fsmState === 'blocked' ||
  fsmState === 'error';

const cloneMessages = (messages: Message[]): Message[] =>
  messages.map((message) => ({ ...message }));

export const deriveRecoveryFsmState = (
  status: StatusEnum,
): RecoveryFsmState => {
  if (status === StatusEnum.CALL_USER) {
    return 'blocked';
  }
  if (status === StatusEnum.ERROR) {
    return 'error';
  }
  if (status === StatusEnum.END) {
    return 'completed';
  }
  if (status === StatusEnum.USER_STOPPED) {
    return 'user_stopped';
  }
  return 'running';
};

export class CheckpointRecoveryService {
  private static instance: CheckpointRecoveryService;
  private checkpoint: RecoveryCheckpointV1 | null = null;

  public static getInstance(): CheckpointRecoveryService {
    if (!CheckpointRecoveryService.instance) {
      CheckpointRecoveryService.instance = new CheckpointRecoveryService();
    }
    return CheckpointRecoveryService.instance;
  }

  public beginRun(params: BeginRunParams): RecoveryCheckpointV1 {
    const checkpoint: RecoveryCheckpointV1 = {
      version: CHECKPOINT_VERSION,
      checkpointId: `${params.sessionId}-${Date.now()}`,
      sessionId: params.sessionId,
      instruction: params.instruction,
      sessionHistoryMessages: cloneMessages(params.sessionHistoryMessages),
      status: StatusEnum.RUNNING,
      fsmState: 'running',
      timestamp: Date.now(),
    };

    this.checkpoint = checkpoint;
    return checkpoint;
  }

  public updateStatus(params: UpdateStatusParams): RecoveryCheckpointV1 | null {
    if (!this.checkpoint || this.checkpoint.sessionId !== params.sessionId) {
      return null;
    }

    this.checkpoint = {
      ...this.checkpoint,
      status: params.status,
      fsmState: params.fsmState,
      errorMsg: params.errorMsg,
      timestamp: Date.now(),
    };

    return this.checkpoint;
  }

  public getCheckpoint(): RecoveryCheckpointV1 | null {
    if (!this.checkpoint) {
      return null;
    }

    return {
      ...this.checkpoint,
      sessionHistoryMessages: cloneMessages(
        this.checkpoint.sessionHistoryMessages,
      ),
    };
  }

  public getRecoverableCheckpoint(): RecoveryCheckpointV1 | null {
    const checkpoint = this.getCheckpoint();
    if (!checkpoint) {
      return null;
    }

    if (!isCheckpointValid(checkpoint)) {
      return null;
    }

    if (!isRecoverableFsmState(checkpoint.fsmState)) {
      return null;
    }

    return checkpoint;
  }

  public clearCheckpoint(): void {
    this.checkpoint = null;
  }

  public resetForTests(): void {
    this.clearCheckpoint();
  }
}

export const isCheckpointValid = (
  checkpoint: RecoveryCheckpointV1,
): boolean => {
  if (checkpoint.version !== CHECKPOINT_VERSION) {
    return false;
  }
  if (checkpoint.instruction.trim().length === 0) {
    return false;
  }
  if (!Array.isArray(checkpoint.sessionHistoryMessages)) {
    return false;
  }
  return true;
};

export const buildResumeInputFromCheckpoint = (
  checkpoint: RecoveryCheckpointV1,
) => {
  if (!isCheckpointValid(checkpoint)) {
    throw new Error('[RECOVERY_CHECKPOINT_INVALID]');
  }

  return {
    instruction: checkpoint.instruction,
    sessionHistoryMessages: cloneMessages(checkpoint.sessionHistoryMessages),
  };
};
