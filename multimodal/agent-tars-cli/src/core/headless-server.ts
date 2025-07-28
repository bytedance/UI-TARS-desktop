/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import http from 'http';
import { AgentTARSAppConfig, LogLevel } from '@agent-tars/interface';
import { AgentServer } from '@multimodal/agent-server';
import boxen from 'boxen';
import chalk from 'chalk';
import { logger } from '../utils';
import { getBootstrapCliOptions } from './state';

interface HeadlessServerOptions {
  appConfig: AgentTARSAppConfig;
  isDebug?: boolean;
  agentConstructor: new (options: any) => any;
  agentName: string;
}

/**
 * Start the Agent Server in headless mode (API only, no UI)
 */
export async function startHeadlessServer(options: HeadlessServerOptions): Promise<http.Server> {
  const { appConfig, isDebug, agentConstructor, agentName } = options;

  // Ensure server config exists with defaults
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  // Get bootstrap options for build info
  const bootstrapOptions = getBootstrapCliOptions();

  // Create and start the server with injected agent
  const server = new AgentServer(
    {
      agentConstructor,
      agentOptions: appConfig,
    },
    {
      agioProvider: bootstrapOptions.agioProvider,
      version: bootstrapOptions.version,
      buildTime: bootstrapOptions.buildTime,
      gitHash: bootstrapOptions.gitHash,
    },
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
