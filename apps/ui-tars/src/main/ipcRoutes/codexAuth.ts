/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';

import { CodexAuthService } from '@main/services/codexAuth';

const t = initIpc.create();

export const codexAuthRoute = t.router({
  codexAuthLogin: t.procedure.input<void>().handle(async () => {
    return CodexAuthService.getInstance().login();
  }),
  codexAuthLogout: t.procedure.input<void>().handle(async () => {
    return CodexAuthService.getInstance().logout();
  }),
  codexAuthStatus: t.procedure.input<void>().handle(async () => {
    return CodexAuthService.getInstance().getStatus();
  }),
});
