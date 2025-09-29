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

/**
 * Get runtime settings schema and current values
 * - If no sessionId provided: returns only schema for home page
 * - If sessionId provided: returns schema + current values for that session
 */
export async function getRuntimeSettings(c: HonoContext) {
  const sessionId = c.req.query('sessionId');
  const server = c.get('server');

  try {
    // Get runtime settings configuration from server config
    const runtimeSettingsConfig = server.appConfig?.server?.runtimeSettings;
    
    if (!runtimeSettingsConfig) {
      return c.json({ 
        schema: { type: 'object', properties: {} },
        currentValues: {}
      }, 200);
    }

    const schema = runtimeSettingsConfig.schema;
    let currentValues = {};

    // If sessionId is provided, get current session values
    if (sessionId) {
      try {
        const sessionInfo = await server.daoFactory.getSessionInfo(sessionId);
        currentValues = sessionInfo?.metadata?.runtimeSettings || {};
      } catch (error) {
        // Session doesn't exist or no stored values, use defaults from schema
      }
    }

    // Merge with default values from schema
    const mergedValues: Record<string, any> = { ...currentValues };
    
    if (schema && schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
        if (mergedValues[key] === undefined && propSchema.default !== undefined) {
          mergedValues[key] = propSchema.default;
        }
      });
    }

    return c.json({
      schema: schema,
      currentValues: sessionId ? mergedValues : {} // Only return current values if sessionId provided
    }, 200);
  } catch (error) {
    console.error(`Error getting runtime settings:`, error);
    return c.json({ error: 'Failed to get runtime settings' }, 500);
  }
}

/**
 * Update runtime settings for a session
 * Requires sessionId parameter
 */
export async function updateRuntimeSettings(c: HonoContext) {
  const body = await c.req.json();
  const { sessionId, runtimeSettings } = body as {
    sessionId: string;
    runtimeSettings: Record<string, any>;
  };

  if (!sessionId) {
    return c.json({ error: 'Session ID is required' }, 400);
  }

  if (!runtimeSettings || typeof runtimeSettings !== 'object') {
    return c.json({ error: 'Runtime settings object is required' }, 400);
  }

  try {
    const server = c.get('server');

    const sessionInfo = await server.daoFactory.getSessionInfo(sessionId);
    if (!sessionInfo) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Update session info with new runtime settings
    const updatedSessionInfo = await server.daoFactory.updateSessionInfo(sessionId, {
      metadata: {
        ...sessionInfo.metadata,
        runtimeSettings,
      },
    });

    // If session is currently active, recreate the agent with new runtime settings
    const activeSession = server.getSessionPool().get(sessionId);
    if (activeSession) {
      console.log('Runtime settings updated', {
        sessionId,
        runtimeSettings,
      });

      try {
        // Recreate agent with new runtime settings configuration
        await activeSession.updateSessionConfig(updatedSessionInfo);
        console.log('Session agent recreated with new runtime settings', { sessionId });
      } catch (error) {
        console.error('Failed to update agent runtime settings for session', { sessionId, error });
        // Continue execution - the runtime settings are saved, will apply on next session
      }
    }

    return c.json({ 
      session: updatedSessionInfo,
      runtimeSettings 
    }, 200);
  } catch (error) {
    console.error(`Error updating runtime settings:`, error);
    return c.json({ error: 'Failed to update runtime settings' }, 500);
  }
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
    const currentSessionInfo = await server.daoFactory.getSessionInfo(sessionId);
    if (!currentSessionInfo) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Update metadata with new model config
    const updatedSessionInfo = await server.daoFactory.updateSessionInfo(sessionId, {
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
        await activeSession.updateSessionConfig(updatedSessionInfo);
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
