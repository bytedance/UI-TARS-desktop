/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createErrorResponse } from '../../utils/error-handler';
import type { HonoContext } from '../../types';

/**
 * Health check endpoint
 */
export async function healthCheck(c: HonoContext) {
  try {
    const server = c.get('server');
    
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      server: {
        running: server.isServerRunning(),
        port: server.port,
        isDebug: server.isDebug,
        isExclusive: server.isExclusive,
      },
      sessions: {
        active: Object.keys(server.sessions).length,
      },
      storage: {
        configured: !!server.storageProvider,
        type: server.storageProvider ? server.getStorageInfo().type : null,
      } as any,
    };

    // Add storage health check if available
    if (server.storageProvider && typeof server.storageProvider.healthCheck === 'function') {
      try {
        const storageHealth = await server.storageProvider.healthCheck();
        health.storage = { ...health.storage, ...storageHealth };
      } catch (error) {
        (health.storage as any).healthy = false;
        (health.storage as any).error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return c.json(health, 200);
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
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
        storage: server.storageProvider ? {
          type: server.getStorageInfo().type,
          configured: true,
        } : null,
      },
    };

    // Add web UI config if available
    const webConfig = server.getAgentConstructorWebConfig();
    if (webConfig) {
      (sanitizedOptions as any).webui = webConfig;
    }

    return c.json({
      options: sanitizedOptions,
      agentName: server.getCurrentAgentName(),
      workspace: server.getCurrentWorkspace(),
    }, 200);
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

    return c.json({
      models,
      defaultModel,
      timestamp: Date.now(),
    }, 200);
  } catch (error) {
    console.error('Failed to get available models:', error);
    return c.json(createErrorResponse(error), 500);
  }
}

/**
 * Update session model configuration
 */
export async function updateSessionModel(c: HonoContext) {
  try {
    const server = c.get('server');
    const body = await c.req.json();
    const { sessionId, provider, modelId } = body;

    if (!sessionId || !provider || !modelId) {
      return c.json({ 
        error: 'sessionId, provider, and modelId are required' 
      }, 400);
    }

    // Validate model configuration
    if (!server.isModelConfigValid(provider, modelId)) {
      return c.json({ 
        error: 'Invalid model configuration',
        availableModels: server.getAvailableModels(),
      }, 400);
    }

    const session = server.sessions[sessionId];
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Update session model configuration in storage if available
    if (server.storageProvider) {
      try {
        const sessionInfo = await server.storageProvider.getSessionInfo(sessionId);
        if (sessionInfo) {
          const updatedSessionInfo = {
            ...sessionInfo,
            modelProvider: provider,
            modelId,
            updatedAt: Date.now(),
          };

          await server.storageProvider.saveSessionInfo(updatedSessionInfo);
        }
      } catch (error) {
        console.warn(`Failed to update session model in storage for ${sessionId}:`, error);
      }
    }

    return c.json({
      success: true,
      sessionId,
      modelConfig: { provider, modelId },
      message: 'Model configuration updated successfully',
    }, 200);
  } catch (error) {
    console.error('Failed to update session model:', error);
    return c.json(createErrorResponse(error), 500);
  }
}