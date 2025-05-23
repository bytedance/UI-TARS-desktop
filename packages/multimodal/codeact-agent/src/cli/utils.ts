/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

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
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `cli_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
