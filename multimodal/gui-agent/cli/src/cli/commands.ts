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
    .version(`GUI Agent CLI v${version} 🚀`, '-v, --version', 'Display the version number');

  program
    .command('run')
    .description('Run GUI Agent automation')
    .option('-p, --presets <url>', 'Load model configuration from preset URL')
    .option('-t, --target <target>', 'Target automation type (computer, browser, android)')
    .option('-q, --query <query>', 'Instruction to execute (optional, will prompt if not provided)')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (options: CliOptions) => {
      try {
        await start(options);
      } catch (err) {
        console.error('Failed to run');
        console.error(err);
        process.exit(1);
      }
    });

  program
    .command('reset')
    .description('Reset stored configuration (API keys, model settings, etc.)')
    .option(
      '-c, --config <path>',
      'Reset specific configuration file (default: ~/.gui-agent-cli.json)',
    )
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
    console.log('  gui-agent run                     # Run with interactive prompts');
    console.log('  gui-agent run -t android          # Run with Android automation');
    console.log('  gui-agent run -q "open calculator"  # Run with specific instruction');
    console.log('  gui-agent reset                    # Reset all configuration');
    console.log('  gui-agent reset -c custom.json     # Reset specific config file');
  }

  program.parse();
};
