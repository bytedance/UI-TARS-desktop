/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { ModelProviderName } from '@multimodal/agent';
import { CodeActAgentOptions } from '../code-act-agent';

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

  // Create node, python, and shell subdirectories
  const nodePath = path.join(workspacePath, 'node');
  const pythonPath = path.join(workspacePath, 'python');
  const shellPath = path.join(workspacePath, 'shell');

  if (!fs.existsSync(nodePath)) {
    fs.mkdirSync(nodePath, { recursive: true });
  }

  if (!fs.existsSync(pythonPath)) {
    fs.mkdirSync(pythonPath, { recursive: true });
  }

  if (!fs.existsSync(shellPath)) {
    fs.mkdirSync(shellPath, { recursive: true });
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
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Resolve a string value that might be an environment variable name
 * If the value is an environment variable name (all uppercase), use its value
 *
 * @param value The value string or environment variable name
 * @param label The label for log messages (default: 'value')
 * @returns The resolved value
 */
export function resolveEnvVar(value: string | undefined, label = 'value'): string | undefined {
  if (!value) return undefined;

  // If value is in all uppercase, treat it as an environment variable
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
    const envValue = process.env[value];
    if (envValue) {
      console.log(`Using ${label} from environment variable: ${value}`);
      return envValue;
    } else {
      console.warn(`Environment variable "${value}" not found, using as literal value`);
    }
  }

  return value;
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
  config: CodeActAgentOptions,
  options: Record<string, string | boolean | number | undefined>,
): CodeActAgentOptions {
  // Create a copy of the config to avoid mutation
  const mergedConfig: CodeActAgentOptions = { ...config };

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
      mergedConfig.model.use.apiKey = resolveEnvVar(options.apiKey as string, 'API key');
    }

    // Set baseURL if specified (resolve environment variables like API key)
    if (options.baseURL) {
      mergedConfig.model.use.baseURL = resolveEnvVar(options.baseURL as string, 'base URL');
    }
  }

  // Handle thinking (reasoning) configuration
  if (options.thinking) {
    mergedConfig.thinking = {
      type: 'enabled',
    };
  }

  if (options.pe) {
    mergedConfig.toolCallEngine = 'prompt_engineering';
  }

  return mergedConfig;
}
