/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';

import { scheduledTaskService } from '@main/services/scheduledTasks';
import type {
  CreateScheduledTaskInput,
  ScheduledTask,
} from '@main/shared/scheduledTasks';

const t = initIpc.create();

export const scheduledTaskRoute = t.router({
  listScheduledTasks: t.procedure.input<void>().handle(async () => {
    return scheduledTaskService.list();
  }),
  createScheduledTask: t.procedure
    .input<CreateScheduledTaskInput>()
    .handle(async ({ input }) => {
      return scheduledTaskService.create(input);
    }),
  updateScheduledTask: t.procedure
    .input<{ id: string; updates: Partial<ScheduledTask> }>()
    .handle(async ({ input }) => {
      return scheduledTaskService.update(input.id, input.updates);
    }),
  deleteScheduledTask: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return scheduledTaskService.delete(input.id);
    }),
  runScheduledTaskNow: t.procedure
    .input<{ id: string }>()
    .handle(async ({ input }) => {
      return scheduledTaskService.runNow(input.id);
    }),
});
