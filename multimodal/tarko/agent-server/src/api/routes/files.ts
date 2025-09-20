/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as filesController from '../controllers/files';

/**
 * Register file upload routes
 * @param app Express application
 */
export function registerFileRoutes(app: express.Application): void {
  app.group('/v1/file', (router: express.Router) => {
    // Upload files endpoint
    router.post('/upload', 
      filesController.uploadMiddleware, 
      filesController.uploadFiles
    );
  });
}
