/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import { generateCsrfToken } from '../hooks/builtInHooks';
import type { ContextVariables } from '../types';

/**
 * Create CSRF token routes
 */
export function createCsrfRoutes(): Hono<{ Variables: ContextVariables }> {
  const router = new Hono<{ Variables: ContextVariables }>();

  router.get('/api/v1/csrf-token', (c) => {
    const token = generateCsrfToken();
    return c.json({ token });
  });

  return router;
}
