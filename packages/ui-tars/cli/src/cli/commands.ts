/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { program } from 'commander';

import { version } from '../../package.json';
import { CliOptions, start } from './start';

export const run = () => {
  program.name('ui-tars').usage('<command> [options]').version(version);

  program
    .command('start')
    .description('starting the ui-tars agent...')
    .option('-p, --presets <url>', 'Model Config Presets')
    .option('-t, --target <target>', 'The target operator')
    .option('-q, --query <query>', "Use's query")
    .option('-l, --auto-learn', 'Automatically learn the app map before running (requires --target adb and --package)')
    .option('-r, --force-relearn', 'Force regenerating the app map even if cached')
    .option(
      '--app-map-mode <mode>',
      'App map usage mode: off, navigation, or two-phase (default: two-phase)',
    )
    .option(
      '--runtime-locale <locale>',
      'Runtime locale preset for map-assisted parsing: default, en, or zh-CN (default: default)',
    )
    .option('--package <pkg>', 'Android app package name (required with --auto-learn)')
    .action(async (options: CliOptions) => {
      try {
        await start(options);
      } catch (err) {
        console.error('Failed to start');
        console.error(err);
        process.exit(1);
      }
    });

  program.parse();
};
