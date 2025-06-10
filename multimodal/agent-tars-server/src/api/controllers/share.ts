/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';
import { ShareService } from '../../services';

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
    const shareService = new ShareService(server.appConfig, server.storageProvider);
    res.status(200).json(shareService.getShareConfig());
  }
}

export const shareController = new ShareController();
