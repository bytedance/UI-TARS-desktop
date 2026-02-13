/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { StatusEnum, Conversation, Message } from '@ui-tars/shared/types';
import { store } from '@main/store/create';
import { runAgent } from '@main/services/runAgent';
import { showWindow } from '@main/window/index';
import {
  CheckpointRecoveryService,
  buildResumeInputFromCheckpoint,
} from '@main/services/checkpointRecovery';
import { ReliabilityObservabilityService } from '@main/services/reliabilityObservability';

import { closeScreenMarker } from '@main/window/ScreenMarker';
import { GUIAgent } from '@ui-tars/sdk';
import { Operator } from '@ui-tars/sdk/core';

const t = initIpc.create();

export class GUIAgentManager {
  private static instance: GUIAgentManager;
  private currentAgent: GUIAgent<Operator> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): GUIAgentManager {
    if (!GUIAgentManager.instance) {
      GUIAgentManager.instance = new GUIAgentManager();
    }
    return GUIAgentManager.instance;
  }

  public setAgent(agent: GUIAgent<Operator>) {
    this.currentAgent = agent;
  }

  public getAgent(): GUIAgent<Operator> | null {
    return this.currentAgent;
  }

  public clearAgent() {
    this.currentAgent = null;
  }
}

export const agentRoute = t.router({
  runAgent: t.procedure.input<void>().handle(async () => {
    const { thinking } = store.getState();
    if (thinking) {
      return;
    }

    store.setState({
      abortController: new AbortController(),
      thinking: true,
      errorMsg: null,
    });

    await runAgent(store.setState, store.getState);

    store.setState({ thinking: false });
  }),
  pauseRun: t.procedure.input<void>().handle(async () => {
    const guiAgent = GUIAgentManager.getInstance().getAgent();
    if (guiAgent instanceof GUIAgent) {
      guiAgent.pause();
      store.setState({ thinking: false });
    }
  }),
  resumeRun: t.procedure.input<void>().handle(async () => {
    const guiAgent = GUIAgentManager.getInstance().getAgent();
    if (guiAgent instanceof GUIAgent) {
      guiAgent.resume();
      store.setState({ thinking: false });
    }
  }),
  stopRun: t.procedure.input<void>().handle(async () => {
    const { abortController } = store.getState();
    store.setState({ status: StatusEnum.END, thinking: false });

    showWindow();

    abortController?.abort();
    const guiAgent = GUIAgentManager.getInstance().getAgent();
    if (guiAgent instanceof GUIAgent) {
      guiAgent.resume();
      guiAgent.stop();
    }

    closeScreenMarker();
  }),
  setInstructions: t.procedure
    .input<{ instructions: string }>()
    .handle(async ({ input }) => {
      store.setState({ instructions: input.instructions });
    }),
  setMessages: t.procedure
    .input<{ messages: Conversation[] }>()
    .handle(async ({ input }) => {
      store.setState({ messages: input.messages });
    }),
  setSessionHistoryMessages: t.procedure
    .input<{ messages: Message[] }>()
    .handle(async ({ input }) => {
      store.setState({ sessionHistoryMessages: input.messages });
    }),
  getRecoveryCheckpoint: t.procedure.input<void>().handle(async () => {
    return CheckpointRecoveryService.getInstance().getRecoverableCheckpoint();
  }),
  recoverFromCheckpoint: t.procedure.input<void>().handle(async () => {
    const checkpoint =
      CheckpointRecoveryService.getInstance().getRecoverableCheckpoint();
    if (!checkpoint) {
      throw new Error('[RECOVERY_CHECKPOINT_MISSING]');
    }

    const resumeInput = buildResumeInputFromCheckpoint(checkpoint);
    store.setState({
      ...store.getState(),
      status: StatusEnum.INIT,
      errorMsg: null,
      instructions: resumeInput.instruction,
      sessionHistoryMessages: resumeInput.sessionHistoryMessages,
    });

    return {
      checkpointId: checkpoint.checkpointId,
      sessionId: checkpoint.sessionId,
      restoredMessageCount: resumeInput.sessionHistoryMessages.length,
    };
  }),
  clearHistory: t.procedure.input<void>().handle(async () => {
    CheckpointRecoveryService.getInstance().clearCheckpoint();

    store.setState({
      status: StatusEnum.END,
      messages: [],
      thinking: false,
      errorMsg: null,
      instructions: '',
    });
  }),
  getReliabilityDashboard: t.procedure.input<void>().handle(async () => {
    return ReliabilityObservabilityService.getInstance().getDashboardSnapshot();
  }),
  evaluateReliabilityReleaseGates: t.procedure
    .input<void>()
    .handle(async () => {
      return ReliabilityObservabilityService.getInstance().evaluateReleaseGates();
    }),
});
