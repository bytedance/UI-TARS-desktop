/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShareService } from "../services";
import type { HonoContext } from '../types';

/**
 * Get share configuration
 */
export function getShareConfig(c: HonoContext) {
  const server = c.get('server');
  const shareService = new ShareService(server.appConfig, server.daoFactory, server);
  return c.json(shareService.getShareConfig(), 200);
}
