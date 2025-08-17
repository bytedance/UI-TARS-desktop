/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as sessionsController from '../controllers/sessions';
import { sessionRestoreMiddleware, exclusiveModeMiddleware } from '../middleware';

/**
 * Register session management routes
 * @param app Express application
 */
export function registerSessionRoutes(app: express.Application): void {
  app.group('/api/v1/sessions', (router: express.Router) => {
    // Get all sessions
    router.get('/', sessionsController.getAllSessions);
    // Create a new session
    router.post('/create', exclusiveModeMiddleware, sessionsController.createSession);
  });

  app.group('/api/v1/sessions', [sessionRestoreMiddleware], (router: express.Router) => {
    // Get session details
    router.get('/details', sessionsController.getSessionDetails);
    // Get session events
    router.get('/events', sessionsController.getSessionEvents);
    // Get latest session events
    router.get('/events/latest', sessionsController.getLatestSessionEvents);
    // Get session status
    router.get('/status', sessionsController.getSessionStatus);
    // Update session metadata
    router.post('/update', sessionsController.updateSession);
    // Delete a session
    router.post('/delete', sessionsController.deleteSession);
    // Generate summary for a session
    router.post('/generate-summary', sessionsController.generateSummary);
    // Share a session
    router.post('/share', sessionsController.shareSession);
    // Get session workspace files
    router.get('/workspace/files', sessionsController.getSessionWorkspaceFiles);
    // Search workspace items for contextual selector
    router.get('/workspace/search', sessionsController.searchWorkspaceItems);
    // Validate workspace paths
    router.post('/workspace/validate', sessionsController.validateWorkspacePaths);
  });
}
