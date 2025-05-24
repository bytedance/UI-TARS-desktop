/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { ModelProviderName } from '@multimodal/agent';

/**
 * Parse dependencies string into an array
 */
export function parseDependencies(deps?: string): string[] {
  if (!deps) return [];
  return deps
    .split(',')
    .map((dep) => dep.trim())
    .filter(Boolean);
}

/**
 * Create a persistent workspace directory if one doesn't exist
 */
export function ensureWorkspace(customPath?: string): string {
  const defaultPath = path.join(os.homedir(), '.codeact');
  const workspacePath = customPath || defaultPath;

  // Create directory if it doesn't exist
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  // Create node and python subdirectories
  const nodePath = path.join(workspacePath, 'node');
  const pythonPath = path.join(workspacePath, 'python');

  if (!fs.existsSync(nodePath)) {
    fs.mkdirSync(nodePath, { recursive: true });
  }

  if (!fs.existsSync(pythonPath)) {
    fs.mkdirSync(pythonPath, { recursive: true });
  }

  return workspacePath;
}

/**
 * Convert an absolute path to a user-friendly path with ~ for home directory
 */
export function toUserFriendlyPath(absolutePath: string): string {
  const homedir = os.homedir();

  if (absolutePath.startsWith(homedir)) {
    return absolutePath.replace(homedir, '~');
  }

  return absolutePath;
}

/**
 * Create a configuration object for CodeActAgent
 */
export interface CodeActConfig {
  workspace?: string;
  enableNodeCodeAct?: boolean;
  enablePythonCodeAct?: boolean;
  cleanupOnExit?: boolean;
  printToConsole?: boolean;
  printLLMOutput?: boolean;
  model?: {
    use?: {
      provider?: ModelProviderName;
      model?: string;
      apiKey?: string;
      baseURL?: string;
    };
  };
  thinking?: {
    type?: 'disabled' | 'enabled';
  };
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Resolve API key for command line options
 * If the key is an environment variable name (all uppercase), use its value
 *
 * @param apiKey The API key string or environment variable name
 * @returns The resolved API key
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
 *
 * @param config The base configuration object
 * @param options Command line options
 * @returns Merged configuration
 */
export function mergeCommandLineOptions(
  config: CodeActConfig,
  options: Record<string, string | boolean | number | undefined>,
): CodeActConfig {
  // Create a copy of the config to avoid mutation
  const mergedConfig: CodeActConfig = { ...config };

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
