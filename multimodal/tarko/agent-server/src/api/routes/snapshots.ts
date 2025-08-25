/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as snapshotsController from '../controllers/snapshots';

/**
 * Register snapshot management routes
 * @param app Express application
 */
export function registerSnapshotRoutes(app: express.Application): void {
  app.group('/api/v1/snapshots', (router: express.Router) => {
    // Get all available snapshots
    router.get('/', snapshotsController.getAllSnapshots);

    // Get specific snapshot by sessionId
    router.get('/:sessionId', snapshotsController.getSnapshot);

    // Get trace data for a specific session
    router.get('/:sessionId/trace', snapshotsController.getSnapshotTrace);

    // Get snapshot files for a specific session
    router.get('/:sessionId/files', snapshotsController.getSnapshotFiles);
  });
}
