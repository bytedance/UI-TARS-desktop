/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { CommonCommandOptions, addCommonOptions, processCommonOptions } from '../options';
import { startInteractiveWebUI } from '../interactive-ui';

/**
 * Register the 'serve' command
 */
export function registerServeCommand(cli: CAC): void {
  const serveCommand = cli.command('serve', 'Launch a headless Agent TARS Server.');

  // Use the common options function to add shared options
  addCommonOptions(serveCommand).action(async (options: CommonCommandOptions = {}) => {
    try {
      const { mergedConfig, isDebug, snapshotConfig } = await processCommonOptions(options);

      await startInteractiveWebUI({
        port: Number(options.port),
        uiMode: 'none',
        config: mergedConfig,
        workspacePath: options.workspace,
        isDebug,
        shareProvider: options.shareProvider,
        snapshot: snapshotConfig,
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}
