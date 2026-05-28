/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { shell } from 'electron';

import { ApprovalQueue } from '@main/services/approvalQueue';
import { FlightRecorder } from '@main/services/flightRecorder';
import { TeamWorkspaceStore } from '@main/services/teamWorkspace';
import type {
  TeamMemberInput,
  TeamWorkspaceUpdate,
} from '@main/services/teamWorkspace';

const t = initIpc.create();

export const teamRoute = t.router({
  getTeamWorkspace: t.procedure.input<void>().handle(async () => {
    return TeamWorkspaceStore.getInstance().getWorkspace();
  }),
  updateTeamWorkspace: t.procedure
    .input<TeamWorkspaceUpdate>()
    .handle(async ({ input }) => {
      return TeamWorkspaceStore.getInstance().updateWorkspace(input);
    }),
  upsertTeamMember: t.procedure
    .input<TeamMemberInput>()
    .handle(async ({ input }) => {
      return TeamWorkspaceStore.getInstance().upsertMember(input);
    }),
  removeTeamMember: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return TeamWorkspaceStore.getInstance().removeMember(input.id);
    }),
  exportTeamAuditReport: t.procedure
    .input<{ reveal?: boolean } | void>()
    .handle(async ({ input }) => {
      const [runs, approvals] = await Promise.all([
        FlightRecorder.getInstance().listRuns(),
        ApprovalQueue.getInstance().list(),
      ]);
      const exportResult =
        await TeamWorkspaceStore.getInstance().exportAuditReport({
          runs,
          approvals,
        });

      if (input?.reveal !== false) {
        shell.showItemInFolder(exportResult.htmlPath);
      }

      return exportResult;
    }),
});
