/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { CommonCommandOptions, addCommonOptions, processCommonOptions } from '../options';
import { startInteractiveWebUI } from '../interactive-ui';

/**
 * Register the interactive UI command
 */
export function registerInteractiveCommand(cli: CAC): void {
  const interactiveUIStartCommand = cli.command('[start]', 'Run Agent TARS in interactive UI');

  // Use the common options function to add shared options
  addCommonOptions(interactiveUIStartCommand).action(
    async (_, options: CommonCommandOptions = {}) => {
      try {
        const { mergedConfig, isDebug, snapshotConfig } = await processCommonOptions(options);

        await startInteractiveWebUI({
          port: Number(options.port),
          uiMode: 'interactive',
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
    },
  );
}
