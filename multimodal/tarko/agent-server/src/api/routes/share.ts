/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import * as shareController from '../controllers/share';
import type { ExtendedExpress } from '../types';

/**
 * Register sharing-related routes
 * @param app Express application or router
 */
export function registerShareRoutes(app: ExtendedExpress): void {
  // Get share configuration
  app.get('/api/v1/share/config', shareController.getShareConfig);
}
