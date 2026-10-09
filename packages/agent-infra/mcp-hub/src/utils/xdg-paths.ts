/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/utils/xdg-paths.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 *
 * XDG Base Directory Specification utilities with backward compatibility
 *
 * This module provides XDG-compliant directory paths while maintaining
 * backward compatibility with existing ~/.mcp-hub installations.
 */
import os from 'os';
import path from 'path';
import fs from 'fs';

type XDGDirectoryType = 'data' | 'state' | 'config';

/**
 * Get XDG-compliant directory paths with fallback to legacy ~/.mcp-hub
 */
export function getXDGDirectory(
  type: XDGDirectoryType,
  subdir: string = '',
): string {
  const homeDir = os.homedir();
  const legacyPath = path.join(homeDir, '.mcp-hub', subdir);

  // Check if legacy path exists and use it for backward compatibility
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  let basePath: string;

  switch (type) {
    case 'data':
      basePath =
        process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share');
      break;
    case 'state':
      basePath =
        process.env.XDG_STATE_HOME || path.join(homeDir, '.local', 'state');
      break;
    case 'config':
      basePath = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
      break;
    default:
      throw new Error(`Unknown XDG directory type: ${type}`);
  }

  return path.join(basePath, 'mcp-hub', subdir);
}

/**
 * Get the log directory path (XDG_STATE_HOME or ~/.local/state/mcp-hub/logs)
 * Falls back to ~/.mcp-hub/logs if it exists
 */
export function getLogDirectory(): string {
  return getXDGDirectory('state', 'logs');
}

/**
 * Get the cache directory path (XDG_DATA_HOME or ~/.local/share/mcp-hub/cache)
 * Falls back to ~/.mcp-hub/cache if it exists
 */
export function getCacheDirectory(): string {
  return getXDGDirectory('data', 'cache');
}

/**
 * Get the data directory path (XDG_DATA_HOME or ~/.local/share/mcp-hub)
 * Falls back to ~/.mcp-hub if it exists
 */
export function getDataDirectory(): string {
  return getXDGDirectory('data');
}
