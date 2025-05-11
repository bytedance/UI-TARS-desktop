#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { startServer } from './server';

const cli = cac('tars');

// FIXME: read package json version
cli.version('0.1.0');
cli.help();

cli
  .command('start', 'Start TARS agent server')
  .option('--port <port>', 'Port to run the server on', { default: 3000 })
  .action(async (options) => {
    const { port } = options;
    try {
      await startServer({ port: Number(port) });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });

// Parse command line arguments
cli.parse();

// If no subcommand is provided, display help information
if (!process.argv.slice(2).length) {
  cli.outputHelp();
}
