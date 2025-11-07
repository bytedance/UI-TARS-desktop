/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { program } from 'commander';

import { version } from '../../package.json';
import { CliOptions, start, resetConfig } from './start';

export const run = () => {
  program
    .name('gui-agent')
    .description('CLI for GUI Agent automation')
    .usage('<command> [options]')
    .version(version);

  program
    .command('start')
    .description('Start GUI Agent automation')
    .option('-p, --presets <url>', 'Load model configuration from preset URL')
    .option('-t, --target <target>', 'Target automation type (nut-js, adb)')
    .option('-q, --query <query>', 'Instruction to execute (optional, will prompt if not provided)')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (options: CliOptions) => {
      try {
        await start(options);
      } catch (err) {
        console.error('Failed to start');
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command('reset')
    .description('Reset stored configuration (API keys, model settings, etc.)')
    .option('-c, --config <path>', 'Reset specific configuration file (default: ~/.gui-agent-cli.json)')
    .action(async (options) => {
      try {
        await resetConfig(options.config);
      } catch (err) {
        console.error('Failed to reset configuration');
        console.error(err);
        process.exit(1);
      }
    });

  // Show help if no command provided
  if (process.argv.length <= 2) {
    program.outputHelp();
    console.log('\nExamples:');
    console.log('  gui-agent start                    # Start with interactive prompts');
    console.log('  gui-agent start -t adb             # Start with Android automation');
    console.log('  gui-agent start -q "open calculator"  # Start with specific instruction');
    console.log('  gui-agent reset                    # Reset all configuration');
    console.log('  gui-agent reset -c custom.json     # Reset specific config file');
  }

  program.parse();
};
