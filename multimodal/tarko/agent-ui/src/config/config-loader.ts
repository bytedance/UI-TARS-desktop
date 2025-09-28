/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BaseAgentWebUIImplementation } from '@tarko/interface';
import { DEFAULT_WEBUI_CONFIG } from './default-config';
import { ENV_CONFIG } from '@/common/constants';
/**
 * Configuration loading result
 */
export interface ConfigLoadResult {
  config: BaseAgentWebUIImplementation;
  source: 'runtime' | 'env' | 'static' | 'default';
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
    const envConfig = ENV_CONFIG.AGENT_WEBUI_CONFIG;
    if (envConfig) {
      const parsed = typeof envConfig === 'string' ? JSON.parse(envConfig) : envConfig;
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
  // Try runtime config (highest priority)
  const runtimeConfig = loadRuntimeConfig();

  if (runtimeConfig) {
    return {
      config: runtimeConfig,
      source: 'runtime',
    };
  }

  // Try environment config first
  const envConfig = loadEnvConfig();

  if (envConfig) {
    return {
      config: envConfig,
      source: 'env',
    };
  }

  return {
    config: DEFAULT_WEBUI_CONFIG,
    source: 'default',
  };
}
