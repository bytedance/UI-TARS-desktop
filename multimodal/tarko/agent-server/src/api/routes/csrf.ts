/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { generateCsrfToken } from '../middleware/csrf-protection';

/**
 * Register CSRF token route
 */
export function registerCsrfRoutes(app: express.Application): void {
  app.get('/api/v1/csrf-token', (_req, res) => {
    const token = generateCsrfToken();
    res.json({ token });
  });
}
