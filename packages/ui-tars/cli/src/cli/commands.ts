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
