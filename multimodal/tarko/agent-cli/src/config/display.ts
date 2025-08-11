/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig } from '@tarko/interface';
import chalk from 'chalk';

/**
 * Simple and elegant configuration logging
 * Only shows essential information with consistent indentation
 */

const INDENT = '  ';
const SUB_INDENT = '    ';

/**
 * Display configuration loading start
 */
export function displayConfigStart() {
  console.log(chalk.bold.blue('🔧 Loading configuration...'));
}

/**
 * Display successful config loading (only for important sources)
 */
export function displayConfigLoaded(source: string, keyCount: number) {
  if (keyCount > 0) {
    console.log(
      INDENT + chalk.green('✓') + ' ' + chalk.cyan(source) + chalk.dim(` (${keyCount} settings)`),
    );
  }
}

/**
 * Display config loading error (only for user-provided paths)
 */
export function displayConfigError(source: string, error: string) {
  console.log(INDENT + chalk.red('✗') + ' ' + chalk.red(source));
  console.log(SUB_INDENT + chalk.dim(error));
}

/**
 * Display deprecated options warning
 */
export function displayDeprecatedWarning(options: string[]) {
  if (options.length === 0) return;

  console.log(
    INDENT + chalk.yellow('⚠️  Deprecated options:') + ' ' + chalk.yellow(options.join(', ')),
  );
  console.log(SUB_INDENT + chalk.dim('Consider using config file format'));
}

/**
 * Display final configuration summary with key settings
 */
export function displayConfigComplete(config: AgentAppConfig) {
  console.log(chalk.bold.green('✅ Configuration loaded'));

  // Show key configuration settings with consistent indentation
  if (config.model?.provider) {
    console.log(INDENT + chalk.cyan('Model:') + ' ' + chalk.bold(config.model.provider));
    if (config.model.id) {
      console.log(SUB_INDENT + chalk.dim('ID: ') + config.model.id);
    }
  }

  if (config.server?.port) {
    const storage = config.server.storage?.type || 'sqlite';
    console.log(
      INDENT +
        chalk.cyan('Server:') +
        ' ' +
        chalk.bold(`port ${config.server.port}`) +
        chalk.dim(`, ${storage}`),
    );
  }

  if (config.logLevel) {
    console.log(INDENT + chalk.cyan('Logging:') + ' ' + chalk.bold(config.logLevel));
  }

  // Show tool configuration if present
  if (config.tools && config.tools.length > 0) {
    console.log(
      INDENT + chalk.cyan('Tools:') + ' ' + chalk.bold(`${config.tools.length} configured`),
    );
  }

  // Show workspace if configured
  if (config.workspace) {
    console.log(INDENT + chalk.cyan('Workspace:') + ' ' + chalk.dim(config.workspace));
  }

  console.log('');
}

/**
 * Display debug information (only when debug mode is enabled)
 */
export function displayDebugInfo(label: string, data: any, isDebug: boolean = false) {
  if (!isDebug) return;

  if (Array.isArray(data)) {
    console.log(INDENT + chalk.dim(`🔍 ${label}: [${data.join(', ')}]`));
  } else if (typeof data === 'object' && data !== null) {
    console.log(INDENT + chalk.dim(`🔍 ${label}: {${Object.keys(data).join(', ')}}`));
  } else {
    console.log(INDENT + chalk.dim(`🔍 ${label}: ${data}`));
  }
}

// Remove unused functions - keep only essential ones
export function displayBuildStart() {
  // Removed - too verbose
}

export function displayMergeSummary() {
  // Removed - not essential for users
}

export function displayServerConfig() {
  // Moved to displayConfigComplete
}

export function displayPathDiscovery() {
  // Removed - internal implementation detail
}
