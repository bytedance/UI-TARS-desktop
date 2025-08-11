/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import chalk from 'chalk';

/**
 * Elegant console output for configuration operations
 * Uses chalk for beautiful formatting without logger prefixes
 */
export const elegantOutput = {
  /**
   * Configuration process start
   */
  configStart(message: string) {
    console.log(chalk.bold.blue('🔧 ') + chalk.bold(message));
  },

  /**
   * Configuration success
   */
  configSuccess(message: string) {
    console.log(chalk.bold.green('✅ ') + chalk.bold(message));
  },

  /**
   * Configuration info with icon
   */
  configInfo(message: string, icon = '📋') {
    console.log(chalk.bold.cyan(icon + ' ') + chalk.bold(message));
  },

  /**
   * Configuration warning
   */
  configWarn(message: string) {
    console.log(chalk.bold.yellow('⚠️  ') + chalk.italic(message));
  },

  /**
   * Configuration error
   */
  configError(message: string) {
    console.log(chalk.bold.red('✗ ') + chalk.bold(message));
  },

  /**
   * Configuration detail (only shown in debug mode)
   */
  configDetail(message: string, isDebug = false) {
    if (isDebug) {
      console.log(chalk.dim('  ' + message));
    }
  },

  /**
   * Configuration list item
   */
  configItem(message: string) {
    console.log(chalk.dim('  - ') + message);
  },

  /**
   * Configuration section with priority level
   */
  configSection(title: string, level: string, icon = '📁') {
    console.log(chalk.bold.magenta(icon + ' ') + chalk.bold(title) + chalk.dim(` [${level}]`));
  },

  /**
   * Configuration keys display
   */
  configKeys(keys: string[], prefix = '') {
    if (keys.length > 0) {
      const keyList = keys.map((key) => chalk.cyan(key)).join(chalk.dim(', ')); // secretlint-disable-line
      console.log(chalk.dim(prefix) + `[${keyList}]`);
    }
  },

  /**
   * Configuration path display
   */
  configPath(path: string, found = true) {
    const icon = found ? chalk.green('✓') : chalk.yellow('○');
    const pathColor = found ? chalk.green : chalk.dim;
    console.log(`  ${icon} ${pathColor(path)}`);
  },

  /**
   * Configuration summary
   */
  configSummary(loaded: number, failed: number) {
    if (loaded > 0) {
      console.log(chalk.bold.green(`  ✓ Successfully loaded: ${loaded} source(s)`));
    }
    if (failed > 0) {
      console.log(chalk.bold.yellow(`  ✗ Failed to load: ${failed} source(s)`));
    }
  },
};
