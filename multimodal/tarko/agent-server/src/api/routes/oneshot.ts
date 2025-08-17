/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as oneshotController from '../controllers/oneshot';
import { exclusiveModeMiddleware } from '../middleware';

/**
 * Register one-shot query routes (create session and execute query in one step)
 * @param app Express application
 */
export function registerOneshotRoutes(app: express.Application): void {
  // Create session and send a query (non-streaming)
  app.post('/api/v1/oneshot/query', exclusiveModeMiddleware, oneshotController.createAndQuery);

  // Create session and send a streaming query
  app.post(
    '/api/v1/oneshot/query/stream',
    exclusiveModeMiddleware,
    oneshotController.createAndStreamingQuery,
  );
}
