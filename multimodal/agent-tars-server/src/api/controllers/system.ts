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
 * Get model information
 */
export function getModelInfo(req: Request, res: Response) {
  try {
    const server = req.app.locals.server as AgentTARSServer;

    // 获取模型信息
    const modelInfo = {
      provider:
        process.env.MODEL_PROVIDER || server.appConfig?.model?.provider || 'Default Provider',
      model: process.env.MODEL_NAME || server.appConfig?.model?.id || 'Default Model',
    };

    res.status(200).json(modelInfo);
  } catch (error) {
    console.error('Error getting model info:', error);
    res.status(500).json({ error: 'Failed to get model information' });
  }
}
