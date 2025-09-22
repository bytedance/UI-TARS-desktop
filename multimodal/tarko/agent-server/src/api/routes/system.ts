/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as systemController from '../controllers/system';

/**
 * Register system information routes
 * @param app Express application
 */
export function registerSystemRoutes(app: express.Application): void {
  // Health check endpoint
  app.get('/api/v1/health', systemController.healthCheck);

  // Version information endpoint
  app.get('/api/v1/version', systemController.getVersion);

  // Agent options endpoint (sanitized)
  app.get('/api/v1/agent/options', systemController.getAgentOptions);

  // Model management endpoints
  app.get('/api/v1/models', systemController.getAvailableModels);
  app.post('/api/v1/sessions/model', systemController.updateSessionModel);
}
