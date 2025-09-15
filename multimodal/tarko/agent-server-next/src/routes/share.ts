/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import * as shareController from '../controllers/share';
import type { ContextVariables } from '../types';

/**
 * Create sharing-related routes
 */
export function createShareRoutes(): Hono<{ Variables: ContextVariables }> {
  const router = new Hono<{ Variables: ContextVariables }>();

  // Get share configuration
  router.get('/api/v1/share/config', shareController.getShareConfig);

  return router;
}
