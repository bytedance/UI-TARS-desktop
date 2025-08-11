/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig } from '@tarko/interface';
import { logger } from '../utils';
import { toUserFriendlyPath } from '../utils';

/**
 * Logger-based configuration logging
 * Clean CLI output by default, detailed logs only in debug mode
 */

/**
 * Log configuration loading start (debug only)
 */
export function logConfigStart(isDebug = false) {
  if (isDebug) {
    logger.debug('Loading configuration...');
  }
}

/**
 * Log successful config loading (debug only)
 */
export function logConfigLoaded(source: string, keyCount: number, isDebug = false) {
  if (!isDebug || keyCount === 0) return;

  const displaySource = source.startsWith('Remote:') ? source : toUserFriendlyPath(source);
  logger.debug(`Loaded config from ${displaySource} (${keyCount} settings)`);
}

/**
 * Log config loading error (always shown for user-provided paths)
 */
export function logConfigError(source: string, error: string) {
  const displaySource = source.startsWith('Remote:') ? source : toUserFriendlyPath(source);
  logger.error(`Failed to load config from ${displaySource}: ${error}`);
}

/**
 * Log deprecated options warning (always shown)
 */
export function logDeprecatedWarning(options: string[]) {
  if (options.length === 0) return;

  logger.warn(
    `Deprecated CLI options detected: ${options.join(', ')}. Consider using config file format.`,
  );
}

/**
 * Log final configuration summary (debug only)
 * Web UI will display the final config, so CLI stays clean
 */
export function logConfigComplete(config: AgentAppConfig, isDebug = false) {
  if (!isDebug) return;

  logger.debug('Configuration loaded successfully');

  // Log key configuration settings in debug mode
  if (config.model?.provider) {
    logger.debug(
      `Model: ${config.model.provider}${config.model.id ? ` (${config.model.id})` : ''}`,
    );
  }

  if (config.server?.port) {
    const storage = config.server.storage?.type || 'sqlite';
    logger.debug(`Server: port ${config.server.port}, storage ${storage}`);
  }

  if (config.logLevel) {
    logger.debug(`Log level: ${config.logLevel}`);
  }

  if (config.tools && config.tools.length > 0) {
    logger.debug(`Tools: ${config.tools.length} configured`);
  }

  if (config.workspace) {
    logger.debug(`Workspace: ${toUserFriendlyPath(config.workspace)}`);
  }
}

/**
 * Log debug information (debug only)
 */
export function logDebugInfo(label: string, data: any, isDebug = false) {
  if (!isDebug) return;

  if (Array.isArray(data)) {
    logger.debug(`${label}: [${data.join(', ')}]`);
  } else if (typeof data === 'object' && data !== null) {
    logger.debug(`${label}: {${Object.keys(data).join(', ')}}`);
  } else {
    logger.debug(`${label}: ${data}`);
  }
}
