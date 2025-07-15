/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { AgentTARSCLIArguments, addCommonOptions, processCommonOptions } from './options';
import { startHeadlessServer } from '../core/headless-server';
import { printWelcomeLogo } from '../utils';
import { getBootstrapCliOptions } from '../core/state';

/**
 * Register the 'serve' command
 */
export function registerServeCommand(cli: CAC): void {
  const serveCommand = cli.command('serve', 'Launch a headless Agent TARS Server.');

  // Use the common options function to add shared options
  addCommonOptions(serveCommand).action(async (options: AgentTARSCLIArguments = {}) => {
    printWelcomeLogo(getBootstrapCliOptions().version!);

    try {
      const { appConfig, isDebug } = await processCommonOptions(options);
      await startHeadlessServer({
        appConfig,
        isDebug,
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}
