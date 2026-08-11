/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type express from 'express';
import { uploadFiles, uploadFilesMiddleware } from '../controllers/files';

/**
 * Register file upload routes.
 *
 * Uploads are workspace-scoped instead of session-scoped so an attachment can
 * be selected on the welcome page before the first session is created.
 */
export function registerFileRoutes(app: express.Application): void {
  app.post('/api/v1/files/upload', uploadFilesMiddleware, uploadFiles);
}
