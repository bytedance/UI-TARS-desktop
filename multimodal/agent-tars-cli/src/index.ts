/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { registerCommands } from './commands';
import { setBootstrapCliOptions, BootstrapCliOptions } from './core/state';
import { printWelcomeLogo } from './utils';

export function bootstrapCli(options: BootstrapCliOptions) {
  const { version, binName } = options;

  console.log('__GIT_HASH__', __GIT_HASH__);

  // Set bootstrap cli options with build time and git hash
  setBootstrapCliOptions({
    ...options,
    version,
    buildTime: __BUILD_TIME__,
    gitHash: __GIT_HASH__,
  });

  // Create CLI with custom styling
  const cli = cac(binName ?? 'tars');

  // Use package.json version
  cli.version(version);

  // Show logo on help command
  cli.help(() => {
    // Print logo before help content
    printWelcomeLogo(version);
  });

  // Register all commands
  registerCommands(cli);

  // Parse command line arguments
  cli.parse();
}
