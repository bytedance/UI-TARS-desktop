/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Next } from 'hono';
import { AgentServer } from '../server';
import type { HonoContext } from '../types';

/**
 * Exclusive mode middleware for Hono
 * Checks if server can accept new requests when in exclusive mode
 */
export async function exclusiveModeMiddleware(
  c: HonoContext,
  next: Next,
): Promise<void | Response> {
  const server = c.get('server');

  // Check if server can accept new requests in exclusive mode
  if (!server.canAcceptNewRequest()) {
    return c.json({
      error: 'Server is in exclusive mode and another session is currently running',
      runningSessionId: server.getRunningSessionId(),
    }, 409);
  }

  await next();
}