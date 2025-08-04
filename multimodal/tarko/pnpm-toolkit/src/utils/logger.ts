/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Logger utility for PTK
 */
import chalk from 'chalk';

const pkg = require('../../package.json');
const PREFIX = `${chalk.cyan('❯')} ${chalk.gray(pkg.name)}`;

export const logger = {
  info: (msg: string) => console.log(`${PREFIX} 💬 ${msg}`),
  warn: (msg: string) => console.log(`${PREFIX} ⚠️  ${msg}`),
  error: (msg: string) => console.log(`${PREFIX} ${chalk.red('error')} ${msg}`),
  success: (msg: string) => console.log(`${PREFIX} ${chalk.green('✓')} ${msg}`),
};
