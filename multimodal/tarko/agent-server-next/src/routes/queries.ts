/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import * as queriesController from '../controllers/queries';
import { sessionRestoreMiddleware } from '../middlewares';
import type { ContextVariables } from '../types';

/**
 * Create query execution routes
 */
export function createQueryRoutes(): Hono<{ Variables: ContextVariables }> {
  const router = new Hono<{ Variables: ContextVariables }>();

  // All query routes require session restore middleware
  router.use('/api/v1/sessions/query', sessionRestoreMiddleware);
  router.use('/api/v1/sessions/query/*', sessionRestoreMiddleware);
  router.use('/api/v1/sessions/abort', sessionRestoreMiddleware);

  // Send a query (non-streaming)
  router.post('/api/v1/sessions/query', queriesController.executeQuery);

  // Send a streaming query
  router.post('/api/v1/sessions/query/stream', queriesController.executeStreamingQuery);

  // Abort a running query
  router.post('/api/v1/sessions/abort', queriesController.abortQuery);

  return router;
}
