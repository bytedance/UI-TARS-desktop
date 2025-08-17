/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { AgentServer } from '../../server';

/**
 * Exclusive mode middleware
 * Checks if server can accept new requests when in exclusive mode
 */
export function exclusiveModeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response {
  const server: AgentServer = req.app.locals.server;

  // Check if server can accept new requests in exclusive mode
  if (!server.canAcceptNewRequest()) {
    return res.status(409).json({
      error: 'Server is in exclusive mode and another session is currently running',
      runningSessionId: server.getRunningSessionId(),
    });
  }

  next();
}
