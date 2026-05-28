/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';

import { ApprovalQueue } from '@main/services/approvalQueue';
import type { ApprovalRequestInput } from '@main/services/approvalQueue';

const t = initIpc.create();

export const approvalRoute = t.router({
  listApprovalRequests: t.procedure.input<void>().handle(async () => {
    return ApprovalQueue.getInstance().list();
  }),
  submitApprovalRequest: t.procedure
    .input<ApprovalRequestInput>()
    .handle(async ({ input }) => {
      return ApprovalQueue.getInstance().submit(input);
    }),
  resolveApprovalRequest: t.procedure
    .input<{
      id: string;
      status: 'approved' | 'denied';
      decisionReason?: string;
    }>()
    .handle(async ({ input }) => {
      return ApprovalQueue.getInstance().resolve(
        input.id,
        input.status,
        input.decisionReason,
      );
    }),
  clearResolvedApprovalRequests: t.procedure.input<void>().handle(async () => {
    return ApprovalQueue.getInstance().clearResolved();
  }),
});
