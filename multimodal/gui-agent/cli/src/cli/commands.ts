/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { program } from 'commander';

import { version } from '../../package.json';
import { CliOptions, start } from './start';

export const run = () => {
  program.name('gui-agent').usage('<command> [options]').version(version);

  program
    .command('start')
    .description('starting the gui-agent...')
    .option('-p, --presets <url>', 'Model Config Presets')
    .option('-t, --target <target>', 'The target operator (nut-js, adb, browser)')
    .option('-q, --query <query>', "User's query/instruction")
    .option('-c, --config <path>', 'Path to config file')
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
