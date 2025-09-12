/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createErrorResponse } from '../../utils/error-handler';
import type { HonoContext } from '../../types';

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
  try {
    const server = c.get('server');

    const version = {
      name: '@tarko/agent-server-next',
      version: process.env.npm_package_version || '0.3.0-beta.11',
      framework: 'hono',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: Date.now(),
    };

    // Add server version info if available
    if (server.versionInfo) {
      Object.assign(version, server.versionInfo);
    }

    return c.json(version, 200);
  } catch (error) {
    console.error('Failed to get version:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Get agent options (sanitized for client)
 */
export async function getAgentOptions(c: HonoContext) {
  try {
    const server = c.get('server');

    // Get current agent and its options
    const agent = server.createAgent();
    const options = agent.getOptions();

    // Sanitize sensitive information
    const sanitizedOptions = {
      logLevel: options.logLevel,
      workspace: options.workspace,
      tools: options.tools ? Object.keys(options.tools) : [],
      model: options.model || null,
      // Only include non-sensitive configuration
      server: {
        port: server.port,
        exclusive: server.isExclusive,
        storage: server.storageProvider
          ? {
              type: server.getStorageInfo().type,
              configured: true,
            }
          : null,
      },
    };

    // Add web UI config if available
    const webConfig = server.getAgentConstructorWebConfig();
    if (webConfig) {
      (sanitizedOptions as any).webui = webConfig;
    }

    return c.json(
      {
        options: sanitizedOptions,
        agentName: server.getCurrentAgentName(),
        workspace: server.getCurrentWorkspace(),
      },
      200,
    );
  } catch (error) {
    console.error('Failed to get agent options:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Get available models
 */
export async function getAvailableModels(c: HonoContext) {
  try {
    const server = c.get('server');

    const models = server.getAvailableModels();
    const defaultModel = server.getDefaultModelConfig();

    return c.json(
      {
        models,
        defaultModel,
        timestamp: Date.now(),
      },
      200,
    );
  } catch (error) {
    console.error('Failed to get available models:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Update session model configuration
 */
export async function updateSessionModel(c: HonoContext) {
  const body = await c.req.json();
  const { sessionId, provider, modelId } = body;
  const server = c.get('server');

  if (!sessionId || !provider || !modelId) {
    return c.json({ error: 'Missing required parameters: sessionId, provider, modelId' }, 400);
  }

  // Validate model configuration
  if (!server.isModelConfigValid(provider, modelId)) {
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
        modelConfig: {
          provider,
          modelId,
          configuredAt: Date.now(),
        },
      },
    });

    // If session is currently active, recreate the agent with new model config
    const activeSession = server.getSessionManager().get(sessionId);

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

    c.json(
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
