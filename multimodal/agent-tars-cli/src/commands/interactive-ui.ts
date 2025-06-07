/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { CAC } from 'cac';
import { AgentTARSCLIArguments, addCommonOptions, processCommonOptions } from './options';
import { startInteractiveWebUI } from '../core/interactive-ui';

/**
 * Register the interactive UI command
 */
export function registerInteractiveUICommand(cli: CAC): void {
  const interactiveUIStartCommand = cli.command('[start]', 'Run Agent TARS in interactive UI');

  // Use the common options function to add shared options
  addCommonOptions(interactiveUIStartCommand).action(
    async (_, options: AgentTARSCLIArguments = {}) => {
      try {
        const { appConfig, isDebug } = await processCommonOptions(options);

        await startInteractiveWebUI({
          appConfig,
          isDebug,
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    },
  );
}
