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
}
