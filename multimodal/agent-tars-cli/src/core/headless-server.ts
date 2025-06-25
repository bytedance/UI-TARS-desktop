/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { AgentTARSAppConfig, LogLevel } from '@agent-tars/interface';
import { AgentTARSServer } from '@agent-tars/server';
import boxen from 'boxen';
import chalk from 'chalk';
import { logger } from '../utils';
import { getBootstrapCliOptions } from './state';

interface HeadlessServerOptions {
  appConfig: AgentTARSAppConfig;
  isDebug?: boolean;
}

/**
 * Start the Agent TARS server in headless mode (API only, no UI)
 */
export async function startHeadlessServer(options: HeadlessServerOptions): Promise<http.Server> {
  const { appConfig, isDebug } = options;

  // Ensure server config exists with defaults
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  // Create and start the server with config
  const tarsServer = new AgentTARSServer(appConfig as Required<AgentTARSAppConfig>, {
    agioProvider: getBootstrapCliOptions().agioProvider,
  });
  const server = await tarsServer.start();

  const port = appConfig.server.port!;
  const serverUrl = `http://localhost:${port}`;

  if (appConfig.logLevel !== LogLevel.SILENT) {
    const boxContent = [
      `${chalk.bold('Agent TARS Headless Server')}`,
      '',
      `${chalk.cyan('API URL:')} ${chalk.underline(serverUrl)}`,
      '',
      `${chalk.cyan('Mode:')} ${chalk.yellow('Headless (API only)')}`,
    ].join('\n');

    console.log(
      boxen(boxContent, {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderColor: 'yellow', // Use yellow to distinguish from interactive mode
        borderStyle: 'classic',
        dimBorder: true,
      }),
    );
  }

  return server;
}
