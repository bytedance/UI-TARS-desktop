/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import type { ContextVariables } from '../types';
import {
  getUserConfig,
  createUserConfig,
  updateUserConfig,
  getOrCreateUserConfig,
  deleteUserConfig,
  addSharedLink,
  removeSharedLink,
  addCustomSpFragment,
  removeCustomSpFragment,
  updateModelProviders,
} from '../controllers/user';

/**
 * Create user configuration routes
 */
export function createUserConfigRoutes() {
  const app = new Hono<{ Variables: ContextVariables }>();

  // Get current user's configuration
  app.get('/api/v1/user', getUserConfig);

  // Create user configuration
  app.post('/api/v1/user', createUserConfig);

  // Update user configuration
  app.put('/api/v1/user', updateUserConfig);

  // Get or create user configuration
  app.get('/api/v1/user/ensure', getOrCreateUserConfig);

  // Delete user configuration
  app.delete('/api/v1/user', deleteUserConfig);

  // Shared links management
  app.post('/api/v1/user/shared-links', addSharedLink);
  app.delete('/api/v1/user/shared-links', removeSharedLink);

  // Custom SP fragments management
  app.post('/api/v1/user/sp-fragments', addCustomSpFragment);
  app.delete('/api/v1/user/sp-fragments', removeCustomSpFragment);

  // Model providers management
  app.put('/api/v1/user/model-providers', updateModelProviders);

  return app;
}
