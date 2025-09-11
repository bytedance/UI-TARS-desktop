/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BaseAgentWebUIImplementation } from '@tarko/interface';
import { DEFAULT_WEBUI_CONFIG } from './default-config';

/**
 * Configuration loading result
 */
export interface ConfigLoadResult {
  config: BaseAgentWebUIImplementation;
  source: 'runtime' | 'env' | 'static' | 'default';
  error?: string;
}

/**
 * Validate configuration structure
 */
function validateConfig(config: BaseAgentWebUIImplementation): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Basic validation - check for expected types
  if (config.title !== undefined && typeof config.title !== 'string') {
    return false;
  }

  if (config.logo !== undefined && typeof config.logo !== 'string') {
    return false;
  }

  if (config.workspace !== undefined && typeof config.workspace !== 'object') {
    return false;
  }

  return true;
}

/**
 * Load configuration from runtime window object (CLI injection)
 */
function loadRuntimeConfig(): BaseAgentWebUIImplementation | null {
  try {
    const config = window.AGENT_WEB_UI_CONFIG;
    if (config && validateConfig(config)) {
      return config;
    }
  } catch (error) {
    console.warn('Failed to load runtime config:', error);
  }
  return null;
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): BaseAgentWebUIImplementation | null {
  try {
    // Access build-time environment variable
    const envConfig = (import.meta as { env?: Record<string, string> }).env?.AGENT_WEBUI_CONFIG;
    if (envConfig) {
      const parsed = JSON.parse(envConfig);
      if (validateConfig(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load environment config:', error);
  }
  return null;
}

/**
 * Load and merge configuration from all sources (synchronously)
 * Only loads runtime and environment configs, skips static file config
 */
export function loadWebUIConfigSync(): ConfigLoadResult {
  let finalConfig = DEFAULT_WEBUI_CONFIG;
  let source: ConfigLoadResult['source'] = 'default';
  let error: string | undefined;

  try {
    let workingConfig = DEFAULT_WEBUI_CONFIG;

    // Try environment config first
    const envConfig = loadEnvConfig();
    if (envConfig) {
      workingConfig = envConfig;
      source = 'env';
    }

    // Try runtime config (highest priority)
    const runtimeConfig = loadRuntimeConfig();
    if (runtimeConfig) {
      workingConfig = runtimeConfig;
      source = 'runtime';
    }

    finalConfig = workingConfig;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to load WebUI config (sync):', error);
  }

  return {
    config: finalConfig,
    source,
    error,
  };
}
