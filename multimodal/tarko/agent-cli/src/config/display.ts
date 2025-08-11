/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig } from '@tarko/interface';
import chalk from 'chalk';

/**
 * Configuration display utilities for elegant config logging
 * Provides user-friendly output without traditional LOG prefixes
 */

/**
 * Display configuration loading start message
 */
export function displayConfigStart() {
  console.log('\n' + chalk.bold.blue('🔧 ') + chalk.bold('Loading configuration...'));
}

/**
 * Display configuration path discovery
 */
export function displayPathDiscovery(paths: string[]) {
  if (paths.length === 0) {
    console.log('   ' + chalk.dim('📋 No custom config paths - using defaults'));
    return;
  }

  console.log(
    '   ' +
      chalk.bold.cyan('📋 ') +
      chalk.bold(`Found ${paths.length} config source${paths.length > 1 ? 's' : ''}:`),
  );
  paths.forEach((path, index) => {
    const priority = paths.length - index;
    console.log('      ' + chalk.dim(`${priority}. `) + chalk.cyan(path));
  });
}

/**
 * Display successful config loading
 */
export function displayConfigLoaded(source: string, keys?: string[]) {
  console.log('   ' + chalk.green('✓ ') + chalk.bold(source));
  if (keys && keys.length > 0) {
    console.log(
      '     ' +
        chalk.dim('→ ') +
        chalk.green(`${keys.length} setting${keys.length > 1 ? 's' : ''} loaded`),
    );
  }
}

/**
 * Display config loading failure
 */
export function displayConfigError(source: string, error: string) {
  console.log('   ' + chalk.red('✗ ') + chalk.bold(source));
  console.log('     ' + chalk.dim('→ ') + chalk.red(error));
}

/**
 * Display configuration building start
 */
export function displayBuildStart() {
  console.log('\n' + chalk.bold.blue('🏗️  ') + chalk.bold('Building application configuration...'));
}

/**
 * Display configuration merge summary
 */
export function displayMergeSummary(userConfig: any, cliConfig: any) {
  const userKeys = Object.keys(userConfig || {});
  const cliKeys = Object.keys(cliConfig || {});

  if (userKeys.length > 0) {
    console.log(
      '   ' +
        chalk.bold.magenta('📁 ') +
        chalk.bold('Config files: ') +
        chalk.cyan(`${userKeys.length} setting${userKeys.length > 1 ? 's' : ''}`),
    );
  }

  if (cliKeys.length > 0) {
    console.log(
      '   ' +
        chalk.bold.yellow('⚡ ') +
        chalk.bold('CLI arguments: ') +
        chalk.cyan(`${cliKeys.length} override${cliKeys.length > 1 ? 's' : ''}`),
    );
  }
}

/**
 * Display deprecated options warning
 */
export function displayDeprecatedWarning(options: string[]) {
  if (options.length === 0) return;

  console.log(
    '   ' +
      chalk.bold.yellow('⚠️  ') +
      chalk.italic('Deprecated options detected: ') +
      chalk.yellow(options.join(', ')),
  );
  console.log('      ' + chalk.dim('Consider migrating to config file format'));
}

/**
 * Display server configuration
 */
export function displayServerConfig(port: number, storage: string) {
  console.log(
    '   ' +
      chalk.bold.blue('🖥️  ') +
      chalk.bold('Server: ') +
      chalk.cyan(`port ${port}`) +
      chalk.dim(', ') +
      chalk.cyan(`storage ${storage}`),
  );
}

/**
 * Display final configuration summary
 */
export function displayConfigComplete(config: AgentAppConfig) {
  const totalKeys = Object.keys(config).length;
  console.log(
    '\n' +
      chalk.bold.green('✅ ') +
      chalk.bold('Configuration ready ') +
      chalk.dim(`(${totalKeys} setting${totalKeys > 1 ? 's' : ''})`),
  );

  // Highlight key configurations
  const highlights: string[] = [];

  if (config.model?.provider) {
    highlights.push(chalk.cyan('Model: ') + chalk.bold(config.model.provider));
  }

  if (config.server?.port) {
    highlights.push(chalk.cyan('Server: ') + chalk.bold(`:${config.server.port}`));
  }

  if (config.logLevel) {
    highlights.push(chalk.cyan('Logging: ') + chalk.bold(config.logLevel));
  }

  if (highlights.length > 0) {
    console.log('   ' + highlights.join(chalk.dim(' • ')));
  }

  console.log('');
}

/**
 * Display debug information (only when debug mode is enabled)
 */
export function displayDebugInfo(label: string, data: any, isDebug: boolean = false) {
  if (!isDebug) return;

  if (Array.isArray(data)) {
    console.log(
      '   ' + chalk.dim('🔍 ') + chalk.dim(label + ': ') + chalk.gray(`[${data.join(', ')}]`),
    );
  } else if (typeof data === 'object') {
    console.log(
      '   ' + chalk.dim('🔍 ') + chalk.dim(label + ': ') + chalk.gray(Object.keys(data).join(', ')),
    );
  } else {
    console.log('   ' + chalk.dim('🔍 ') + chalk.dim(label + ': ') + chalk.gray(data));
  }
}
