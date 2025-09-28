/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import * as systemController from '../controllers/system';
import type { ContextVariables } from '../types';
/**
 * Create system information routes
 */
export function createSystemRoutes(): Hono<{ Variables: ContextVariables }> {
  const router = new Hono<{ Variables: ContextVariables }>();

  // Health check endpoint
  router.get('/api/v1/health', systemController.healthCheck);

  // Version information endpoint
  router.get('/api/v1/version', systemController.getVersion);

  // Agent options endpoint (sanitized)
  router.get('/api/v1/agent/options', systemController.getAgentOptions);

  // Runtime settings endpoints
  router.get('/api/v1/runtime-settings', systemController.getRuntimeSettings);
  router.post('/api/v1/runtime-settings', systemController.updateRuntimeSettings);

  // Model management endpoints
  router.get('/api/v1/models', systemController.getAvailableModels);
  router.post('/api/v1/sessions/model', systemController.updateSessionModel);

  return router;
}
