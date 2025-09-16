/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HonoContext } from '../types';
import { getPublicAvailableModels, isModelConfigValid } from '../utils/model-utils';
import { sanitizeAgentOptions } from '../utils/config-sanitizer';
/**
 * Health check endpoint
 */
export function healthCheck(c: HonoContext) {
  return c.json({ status: 'ok' }, 200);
}

/**
 * Get version information
 */
export async function getVersion(c: HonoContext) {
  const server = c.get('server');

  return c.json({
    version: server.versionInfo?.version,
    buildTime: server.versionInfo?.buildTime,
    gitHash: server.versionInfo?.gitHash,
  }, 200);
}

/**
 * Get agent options (sanitized for client)
 */
export async function getAgentOptions(c: HonoContext) {
 const server = c.get('server')
  return c.json({
    options: sanitizeAgentOptions(server.appConfig),
  }, 200);
}

export function getAvailableModels(c: HonoContext) {
  const server = c.get('server');

  const models = getPublicAvailableModels(server.appConfig);
  return c.json({ models }, 200);
}

/**
 * Update session model configuration
 */
export async function updateSessionModel(c: HonoContext) {
  const body = await c.req.json();
  const { sessionId, model } = body;
  const server = c.get('server');

  if (!sessionId || !model || !model.provider || !model.id) {
    return c.json({ error: 'Missing required parameters: sessionId, provider, modelId' }, 400);
  }

  // Validate model configuration
   if (!isModelConfigValid(server.appConfig, model.provider, model.id)) {
    return c.json({ error: 'Invalid model configuration' }, 400);
  }


  try {
    // Get current session metadata
    const currentSessionInfo = await server.storageProvider.getSessionInfo(sessionId);
    if (!currentSessionInfo) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Update metadata with new model config
    const updatedSessionInfo = await server.storageProvider.updateSessionInfo(sessionId, {
      metadata: {
        ...currentSessionInfo.metadata,
        modelConfig: model,
      },
    });

    // If session is currently active, recreate the agent with new model config
    const activeSession = server.getSessionPool().get(sessionId);

    if (activeSession) {
      console.log('Session model updated', {
          sessionId,
          provider: model.provider,
          modelId: model.id,
        });

      try {
        // Recreate agent with new model configuration
        await activeSession.updateModelConfig(updatedSessionInfo);
        console.log(`Session ${sessionId} agent recreated with new model config`);
      } catch (error) {
        console.error(`Failed to update agent model config for session ${sessionId}:`, error);
        // Continue execution - the model config is saved, will apply on next session
      }
    }

    return c.json(
      {
        success: true,
        sessionInfo: updatedSessionInfo,
      },
      200,
    );
  } catch (error) {
    console.error('Failed to update session model:', error);
    c.json({ error: 'Failed to update session model' }, 500);
  }
}
