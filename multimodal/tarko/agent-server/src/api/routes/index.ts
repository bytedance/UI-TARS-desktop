/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { registerSessionRoutes } from './sessions';
import { registerQueryRoutes } from './queries';
import { registerSystemRoutes } from './system';
import { registerShareRoutes } from './share';
import { registerOneshotRoutes } from './oneshot';
import type { ExtendedExpress } from '../types';

/**
 * Register all API routes with the Express application or router
 * @param app Express application or router
 */
export function registerAllRoutes(app: ExtendedExpress): void {
  registerSessionRoutes(app);
  registerQueryRoutes(app);
  registerSystemRoutes(app);
  registerShareRoutes(app);
  registerOneshotRoutes(app);
}
