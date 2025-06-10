/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { printWelcomeLogo } from './utils';
import { registerCommands } from './commands';
import { setBootstrapCliOptions, BootstrapCliOptions } from './core/state';

export function bootstrapCli(options: BootstrapCliOptions = {}) {
  // Display ASCII art LOGO immediately at program entry
  printWelcomeLogo();

  // Set bootstrap cli options
  setBootstrapCliOptions(options);

  // Create CLI with custom styling
  const cli = cac('tars');

  // Use package.json version
  cli.version(__VERSION__);
  cli.help();

  // Register all commands
  registerCommands(cli);

  // Parse command line arguments
  cli.parse();
}
