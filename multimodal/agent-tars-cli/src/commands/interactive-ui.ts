/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { CAC } from 'cac';
import { ExtendedCLIArguments, addCommonOptions, processCommonOptions } from './options';
import { startInteractiveWebUI } from '../core/interactive-ui';
import { printWelcomeLogo } from '../utils';
import { getBootstrapCliOptions } from '../core/state';

/**
 * Register the interactive UI command
 */
export function registerInteractiveUICommand(cli: CAC): void {
  const interactiveUIStartCommand = cli.command('[start]', 'Run Agent in interactive UI');

  // Use the common options function to add shared options
  addCommonOptions(interactiveUIStartCommand).action(
    async (_, options: ExtendedCLIArguments = {}) => {
      printWelcomeLogo(getBootstrapCliOptions().version!);

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await processCommonOptions(options);

        await startInteractiveWebUI({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    },
  );
}
