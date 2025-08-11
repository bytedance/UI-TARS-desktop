/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { sanitizeAgentOptions } from '../../utils/config-sanitizer';

/**
 * Health check endpoint
 */
export function healthCheck(req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}

/**
 * Get version information including git hash
 */
export function getVersion(req: Request, res: Response) {
  const server = req.app.locals.server;
  res.status(200).json({
    version: server.versionInfo?.version,
    buildTime: server.versionInfo?.buildTime,
    gitHash: server.versionInfo?.gitHash,
  });
}

/**
 * Get current agent information
 */
export function getAgentInfo(req: Request, res: Response) {
  const server = req.app.locals.server;
  res.status(200).json({
    name: server.getCurrentAgentName() || 'Unknown Agent',
  });
}

/**
 * Get current agent options (sanitized)
 */
export function getAgentOptions(req: Request, res: Response) {
  const server = req.app.locals.server;
  const sanitizedOptions = sanitizeAgentOptions(server.appConfig);

  res.status(200).json({
    options: sanitizedOptions,
  });
}
