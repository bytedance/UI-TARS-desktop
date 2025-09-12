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
 * Get current agent options (sanitized)
 */
export function getAgentOptions(req: Request, res: Response) {
  const server = req.app.locals.server;
  const sanitizedOptions = sanitizeAgentOptions(server.appConfig);

  res.status(200).json({
    options: sanitizedOptions,
  });
}

/**
 * Get available model providers and configurations
 */
export function getAvailableModels(req: Request, res: Response) {
  const server = req.app.locals.server;
  const availableModels = server.getAvailableModels();

  const modelsByProvider = availableModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      // Deduplication configuration
      if (!acc[model.provider].includes(model.id)) {
        acc[model.provider].push(model.id);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const models = Object.entries(modelsByProvider).map(([provider, modelIds]) => ({
    provider,
    models: modelIds,
  }));

  res.status(200).json({
    models,
  });
}

/**
 * Update session model configuration
 */
export async function updateSessionModel(req: Request, res: Response) {
  const { sessionId, provider, modelId } = req.body;
  const server = req.app.locals.server;

  if (!sessionId || !provider || !modelId) {
    return res
      .status(400)
      .json({ error: 'Missing required parameters: sessionId, provider, modelId' });
  }

  // Validate model configuration
  if (!server.isModelConfigValid(provider, modelId)) {
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

      // Find the model to get its displayName
      const availableModels = server.getAvailableModels();
      const selectedModel = availableModels.find(
        (model) => model.provider === provider && model.id === modelId,
      );

      // Update metadata with new model config
      const updatedSessionInfo = await server.storageProvider.updateSessionInfo(sessionId, {
        metadata: {
          ...currentSessionInfo.metadata,
          modelConfig: {
            provider,
            modelId,
            displayName: selectedModel?.displayName, // Include displayName if available
            configuredAt: Date.now(),
          },
        },
      });

      // If session is currently active, recreate the agent with new model config
      const activeSession = server.sessions[sessionId];
      if (activeSession) {
        console.log(`Session ${sessionId} model updated to ${provider}:${modelId}`);

        try {
          // Recreate agent with new model configuration
          await activeSession.updateModelConfig(updatedSessionInfo);
          console.log(`Session ${sessionId} agent recreated with new model config`);
        } catch (error) {
          console.error(`Failed to update agent model config for session ${sessionId}:`, error);
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
