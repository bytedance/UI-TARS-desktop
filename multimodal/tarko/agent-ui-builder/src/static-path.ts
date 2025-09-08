/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

/**
 * Get the default static path for the agent UI
 *
 * This function provides the default location where the built agent UI files
 * are located within the agent-ui-builder package.
 *
 * @returns Absolute path to the static UI files
 */
export function getDefaultStaticPath(): string {
  return path.resolve(__dirname, '../static');
}

/**
 * Check if the default static path exists and contains the required index.html
 *
 * @returns True if the static path is valid and ready to use
 */
export function isDefaultStaticPathValid(): boolean {
  try {
    const fs = require('fs');
    const staticPath = getDefaultStaticPath();
    const indexPath = path.join(staticPath, 'index.html');
    return fs.existsSync(indexPath);
  } catch {
    return false;
  }
}

/**
 * Get static path with fallback logic
 *
 * This function provides a robust way to get the static path:
 * 1. First tries the provided custom path
 * 2. Falls back to the default static path if custom path is not provided
 * 3. Validates that the path exists and contains index.html
 *
 * @param customPath Optional custom static path
 * @returns Valid static path
 * @throws Error if no valid static path can be found
 */
export function getStaticPath(customPath?: string): string {
  const fs = require('fs');

  // If custom path is provided, validate it
  if (customPath) {
    const indexPath = path.join(customPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return customPath;
    }
    throw new Error(`Custom static path invalid: ${customPath} (index.html not found)`);
  }

  // Try default static path
  const defaultPath = getDefaultStaticPath();
  const defaultIndexPath = path.join(defaultPath, 'index.html');

  if (fs.existsSync(defaultIndexPath)) {
    return defaultPath;
  }

  throw new Error(
    `No valid static path found. ` +
      `Default path ${defaultPath} does not contain index.html. ` +
      `Make sure agent-ui is built or provide a custom staticPath.`,
  );
}
