#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { startServer } from '@agent-tars/server';
import { startInteractiveCLI } from './interactive-cli';

const cli = cac('tars');

// Use package.json version
cli.version(__VERSION__);
cli.help();

cli
  .command('serve', 'Start Agent TARS Server.')
  .option('--port <port>', 'Port to run the server on', { default: 3000 })
  .action(async (options) => {
    const { port } = options;
    try {
      await startServer({ port: Number(port), uiMode: 'none' });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });

cli
  .command('run', 'Run Agent TARS in interactive mode with optional UI')
  .option('--ui [mode]', 'UI mode: "interactive" (default) or "plain"', { default: false })
  .option('--port <port>', 'Port to run the server on (when using UI)', { default: 3000 })
  .action(async (options) => {
    const { ui, port } = options;

    // Handle UI modes
    if (ui) {
      const uiMode = ui === true ? 'interactive' : ui;
      if (!['interactive', 'plain'].includes(uiMode)) {
        console.error(`Invalid UI mode: ${uiMode}. Supported modes: interactive, plain`);
        process.exit(1);
      }

      try {
        await startServer({ port: Number(port), uiMode });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    } else {
      // CLI interactive mode
      await startInteractiveCLI();
    }
  });

// Parse command line arguments
cli.parse();

// If no subcommand is provided, display help information
if (!process.argv.slice(2).length) {
  cli.outputHelp();
}
