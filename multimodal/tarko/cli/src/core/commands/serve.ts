/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { AgentConstructor, AgentAppConfig, LogLevel } from '@tarko/agent-server-interface';
import { AgentServer, AgentServerExtraOptions } from '@tarko/agent-server';
import boxen from 'boxen';
import chalk from 'chalk';

interface HeadlessServerOptions {
  appConfig: AgentAppConfig;
  isDebug?: boolean;
  agentConstructor: AgentConstructor;
  agentName: string;
  extraOptions?: AgentServerExtraOptions;
}

/**
 * Start the Agent Server in headless mode (API only, no UI)
 */
export async function startHeadlessServer(options: HeadlessServerOptions): Promise<http.Server> {
  const { appConfig, agentConstructor, agentName, extraOptions } = options;

  // Ensure server config exists with defaults
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  // Create and start the server with injected agent
  const server = new AgentServer(
    {
      agentConstructor,
      agentOptions: appConfig,
    },
    extraOptions,
  );

  const httpServer = await server.start();

  const port = appConfig.server!.port!;
  const serverUrl = `http://localhost:${port}`;

  if (appConfig.logLevel !== LogLevel.SILENT) {
    const boxContent = [
      `${chalk.bold(`${agentName} Headless Server`)}`,
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
