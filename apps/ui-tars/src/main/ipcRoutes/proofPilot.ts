/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { shell } from 'electron';

import { FlightRecorder } from '@main/services/flightRecorder';

const t = initIpc.create();

export const proofPilotRoute = t.router({
  listProofPilotRuns: t.procedure.input<void>().handle(async () => {
    return FlightRecorder.getInstance().listRuns();
  }),
  getProofPilotRun: t.procedure
    .input<{ runId: string }>()
    .handle(async ({ input }) => {
      return FlightRecorder.getInstance().getRun(input.runId);
    }),
  exportProofPilotRun: t.procedure
    .input<{ runId: string; open?: boolean }>()
    .handle(async ({ input }) => {
      const exportResult = await FlightRecorder.getInstance().exportProofPack(
        input.runId,
      );
      const openError =
        input.open === false
          ? undefined
          : await shell.openPath(exportResult.htmlPath);

      return {
        ...exportResult,
        openError: openError || undefined,
      };
    }),
  exportProofPilotWorkflowCapsule: t.procedure
    .input<{ runId: string; reveal?: boolean }>()
    .handle(async ({ input }) => {
      const exportResult =
        await FlightRecorder.getInstance().exportWorkflowCapsule(input.runId);

      if (input.reveal !== false) {
        shell.showItemInFolder(exportResult.capsulePath);
      }

      return exportResult;
    }),
  compileProofPilotWorkflow: t.procedure
    .input<{ runId: string; reveal?: boolean }>()
    .handle(async ({ input }) => {
      const exportResult = await FlightRecorder.getInstance().compileWorkflow(
        input.runId,
      );

      if (input.reveal !== false) {
        shell.showItemInFolder(exportResult.workflowPath);
      }

      return exportResult;
    }),
});
