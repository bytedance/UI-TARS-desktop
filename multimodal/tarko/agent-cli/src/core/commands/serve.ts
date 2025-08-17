/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { LogLevel } from '@tarko/interface';
import { AgentCLIServeCommandOptions } from '../../types';
import { AgentServer } from '@tarko/agent-server';
import { ensureServerConfig } from '../../utils';
import boxen from 'boxen';
import chalk from 'chalk';

/**
 * Start the Agent Server in headless mode (API only, no UI)
 */
export async function startHeadlessServer(
  options: AgentCLIServeCommandOptions,
): Promise<http.Server> {
  const { agentServerInitOptions } = options;
  const { appConfig } = agentServerInitOptions;

  await ensureServerConfig(appConfig);

  // Create and start the server with injected agent
  const server = new AgentServer(agentServerInitOptions);
  const httpServer = await server.start();

  const port = appConfig.server!.port!;
  const serverUrl = `http://localhost:${port}`;

  if (appConfig.logLevel !== LogLevel.SILENT) {
    const boxContent = [
      `${chalk.bold(`${server.getCurrentAgentName()} Headless Server`)}`,
      '',
      `${chalk.cyan('API URL:')} ${chalk.underline(serverUrl)}`,
      '',
      `${chalk.cyan('Mode:')} ${chalk.yellow('Headless (API only)')}`,
    ].join('\n');

    console.log(
      boxen(boxContent, {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderColor: 'yellow',
        borderStyle: 'classic',
        dimBorder: true,
      }),
    );
  }

  return httpServer;
}
