/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';

/**
 * Health check endpoint
 */
export function healthCheck(req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}

/**
 * Get version information
 */
export function getVersion(req: Request, res: Response) {
  const server = req.app.locals.server;
  res.status(200).json({
    version: server.extraOptions?.version,
    buildTime: server.extraOptions?.buildTime,
  });
}
