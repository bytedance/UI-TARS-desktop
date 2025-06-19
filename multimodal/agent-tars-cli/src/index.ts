/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { registerCommands } from './commands';
import { setBootstrapCliOptions, BootstrapCliOptions } from './core/state';

export function bootstrapCli(options: BootstrapCliOptions) {
  const { version, binName } = options;

  // Set bootstrap cli options
  setBootstrapCliOptions({
    ...options,
    version,
  });

  // Create CLI with custom styling
  const cli = cac(binName ?? 'tars');

  // Use package.json version
  cli.version(version);
  cli.help();

  // Register all commands
  registerCommands(cli);

  // Parse command line arguments
  cli.parse();
}
