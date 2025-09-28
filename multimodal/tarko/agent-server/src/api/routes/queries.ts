/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as queriesController from '../controllers/queries';
import { sessionRestoreMiddleware } from '../middleware';
import type { ExtendedExpress } from '../types';

/**
 * Register query execution routes
 * @param app Express application or router
 */
export function registerQueryRoutes(app: ExtendedExpress): void {
  app.group('/api/v1/sessions', [sessionRestoreMiddleware], (router: express.Router) => {
    // Send a query (non-streaming)
    router.post('/query', queriesController.executeQuery);
    // Send a streaming query
    router.post('/query/stream', queriesController.executeStreamingQuery);
    // Abort a running query
    router.post('/abort', queriesController.abortQuery);
  });
}
