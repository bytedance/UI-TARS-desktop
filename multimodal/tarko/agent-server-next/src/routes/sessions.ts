/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import * as sessionsController from '../controllers/sessions';
import { sessionRestoreMiddleware, exclusiveModeMiddleware } from '../middlewares';
import type { ContextVariables } from '../types';

/**
 * Create session management routes
 */
export function createSessionRoutes(): Hono<{ Variables: ContextVariables }> {
  const router = new Hono<{ Variables: ContextVariables }>();

  // Routes that don't require session restore
  router.get('/api/v1/sessions', sessionsController.getAllSessions);
  router.post('/api/v1/sessions/create', exclusiveModeMiddleware, sessionsController.createSession);

  // Routes that require session restore middleware
  router.use('/api/v1/sessions/status', sessionRestoreMiddleware);
  router.use('/api/v1/sessions/generate-summary', sessionRestoreMiddleware);
  router.use('/api/v1/sessions/share', sessionRestoreMiddleware);
  router.use('/api/v1/sessions/workspace/*', sessionRestoreMiddleware);

  // Session-specific routes
  router.get('/api/v1/sessions/details', sessionsController.getSessionDetails);
  router.get('/api/v1/sessions/events', sessionsController.getSessionEvents);
  router.get('/api/v1/sessions/events/latest', sessionsController.getLatestSessionEvents);
  router.get('/api/v1/sessions/status', sessionsController.getSessionStatus);
  router.post('/api/v1/sessions/update', sessionsController.updateSession);
  router.post('/api/v1/sessions/delete', sessionsController.deleteSession);
  router.post('/api/v1/sessions/generate-summary', sessionsController.generateSummary);
  router.post('/api/v1/sessions/share', sessionsController.shareSession);

  return router;
}
