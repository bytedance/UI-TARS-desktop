/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { sanitizeAgentOptions } from '../../utils/config-sanitizer';
import { getPublicAvailableModels, isModelConfigValid } from '../../utils/model-utils';

export function healthCheck(req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}

export function getVersion(req: Request, res: Response) {
  const server = req.app.locals.server;
  res.status(200).json({
    version: server.versionInfo?.version,
    buildTime: server.versionInfo?.buildTime,
    gitHash: server.versionInfo?.gitHash,
  });
}

export function getAgentOptions(req: Request, res: Response) {
  const server = req.app.locals.server;
  res.status(200).json({
    options: sanitizeAgentOptions(server.appConfig),
  });
}

export function getAvailableModels(req: Request, res: Response) {
  const server = req.app.locals.server;
  const models = getPublicAvailableModels(server.appConfig);

  res.status(200).json({ models });
}

/**
 * Update session model configuration
 */
export async function updateSessionModel(req: Request, res: Response) {
  const { sessionId, model } = req.body;
  const server = req.app.locals.server;

  if (!sessionId || !model || !model.provider || !model.id) {
    return res
      .status(400)
      .json({ error: 'Missing required parameters: sessionId, model (with provider and id)' });
  }

  // Validate model configuration
  if (!isModelConfigValid(server.appConfig, model.provider, model.id)) {
    return res.status(400).json({ error: 'Invalid model configuration' });
  }

  try {
    // Update session model configuration
    if (server.storageProvider) {
      // Get current session metadata
      const currentSessionInfo = await server.storageProvider.getSessionInfo(sessionId);
      if (!currentSessionInfo) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Update metadata with new model config
      const updatedSessionInfo = await server.storageProvider.updateSessionInfo(sessionId, {
        metadata: {
          ...currentSessionInfo.metadata,
          modelConfig: model,
        },
      });

      // If session is currently active, recreate the agent with new model config
      const activeSession = server.sessions[sessionId];
      if (activeSession) {
        console.log('Session model updated', {
          sessionId,
          provider: model.provider,
          modelId: model.id,
        });

        try {
          // Recreate agent with new model configuration
          await activeSession.updateModelConfig(updatedSessionInfo);
          console.log('Session agent recreated with new model config', { sessionId });
        } catch (error) {
          console.error('Failed to update agent model config for session', { sessionId, error });
          // Continue execution - the model config is saved, will apply on next session
        }
      }

      res.status(200).json({
        success: true,
        sessionInfo: updatedSessionInfo,
      });
    } else {
      res.status(400).json({ error: 'Storage not configured' });
    }
  } catch (error) {
    console.error('Failed to update session model:', error);
    res.status(500).json({ error: 'Failed to update session model' });
  }
}
