/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';

/**
 * ShareController - Handles sharing-related API endpoints
 *
 * Responsible for:
 * - Share configuration retrieval
 * - Sharing functionality
 */
export class ShareController {
  /**
   * Get share configuration
   */
  getShareConfig(req: Request, res: Response) {
    const server = req.app.locals.server as AgentTARSServer;

    res.status(200).json({
      hasShareProvider: !!server.appConfig.share.provider,
      shareProvider: server.appConfig.share.provider || null,
    });
  }
}

export const shareController = new ShareController();
