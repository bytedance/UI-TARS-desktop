/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSOptions, ModelProviderName } from '@agent-tars/core';
import os from 'os';
import path from 'path';

/**
 * Resolve API key for command line options
 * If the key is an environment variable name (all uppercase), use its value
 */
export function resolveApiKey(apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined;

  // If apiKey is in all uppercase, treat it as an environment variable
  if (/^[A-Z][A-Z0-9_]*$/.test(apiKey)) {
    const envValue = process.env[apiKey];
    if (envValue) {
      console.log(`Using API key from environment variable: ${apiKey}`);
      return envValue;
    } else {
      console.warn(`Environment variable "${apiKey}" not found, using as literal value`);
    }
  }

  return apiKey;
}

/**
 * Merges command line options into loaded config
 * Prioritizes command line options over config file values
 */
export function mergeCommandLineOptions(
  config: AgentTARSOptions,
  options: Record<string, string | boolean | number | undefined>,
): AgentTARSOptions {
  // Create a copy of the config to avoid mutation
  const mergedConfig: AgentTARSOptions = { ...config };

  // Handle model configuration
  if (options.provider || options.model || options.apiKey || options.baseURL) {
    // Initialize model configuration if not present
    if (!mergedConfig.model) {
      mergedConfig.model = {};
    }

    // Initialize 'use' configuration if not present
    if (!mergedConfig.model.use) {
      mergedConfig.model.use = {};
    }

    // Set provider if specified
    if (options.provider) {
      mergedConfig.model.use.provider = options.provider as ModelProviderName;
    }

    // Set model if specified
    if (options.model) {
      mergedConfig.model.use.model = options.model as string;
    }

    // Set API key if specified (resolve environment variables)
    if (options.apiKey) {
      mergedConfig.model.use.apiKey = resolveApiKey(options.apiKey as string);
    }

    // Set baseURL if specified
    if (options.baseURL) {
      mergedConfig.model.use.baseURL = options.baseURL as string;
    }
  }

  // Handle thinking (reasoning) configuration
  if (options.thinking) {
    mergedConfig.thinking = {
      type: 'enabled',
    };
  }

  return mergedConfig;
}

/**
 * Converts an absolute path to a user-friendly path with ~ for home directory
 * @param absolutePath The absolute path to convert
 * @returns A user-friendly path with ~ for home directory
 */
export function toUserFriendlyPath(absolutePath: string): string {
  const homedir = os.homedir();

  if (absolutePath.startsWith(homedir)) {
    return absolutePath.replace(homedir, '~');
  }

  return absolutePath;
}
