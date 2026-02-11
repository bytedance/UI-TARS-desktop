/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';

import {
  captureTeachSnapshot,
  deleteTeachSkill,
  exportTeachSkill,
  getTeachSkill,
  importTeachSkill,
  listTeachSkills,
  replayTeachSkill,
  saveTeachSkill,
  type TeachSkillPortable,
  type TeachSkillSaveInput,
} from '@main/services/teachSkills';

const t = initIpc.create();

export const teachRoute = t.router({
  teachCaptureSnapshot: t.procedure.input<void>().handle(async () => {
    return captureTeachSnapshot();
  }),
  teachSaveSkill: t.procedure
    .input<TeachSkillSaveInput>()
    .handle(async ({ input }) => {
      return saveTeachSkill(input);
    }),
  teachListSkills: t.procedure.input<void>().handle(async () => {
    return listTeachSkills();
  }),
  teachGetSkill: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return getTeachSkill(input.id);
    }),
  teachReplaySkill: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return replayTeachSkill(input.id);
    }),
  teachExportSkill: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return exportTeachSkill(input.id);
    }),
  teachImportSkill: t.procedure
    .input<TeachSkillPortable>()
    .handle(async ({ input }) => {
      return importTeachSkill(input);
    }),
  teachDeleteSkill: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return deleteTeachSkill(input.id);
    }),
});
