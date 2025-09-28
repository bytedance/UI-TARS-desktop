/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import http from 'http';
import {
  LogLevel,
  isAgentWebUIImplementationType,
  AgentWebUIImplementation,
} from '@tarko/interface';
import { AgentServer, AgentServerOptions, express, mergeWebUIConfig } from '@tarko/agent-server';
import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';
import { logger, toUserFriendlyPath, ensureServerConfig } from '../../utils';
import { createPathMatcher } from '@tarko/shared-utils';
import { AgentCLIRunInteractiveUICommandOptions } from '../../types';

/**
 * Start the Agent Server with UI capabilities
 */
export async function startInteractiveWebUI(
  options: AgentCLIRunInteractiveUICommandOptions,
): Promise<http.Server> {
  const { agentServerInitOptions, isDebug } = options;
  const { appConfig } = agentServerInitOptions;
  const webui = appConfig.webui!;

  await ensureServerConfig(appConfig);

  if (isAgentWebUIImplementationType(webui, 'static')) {
    // Set up static path if provided
    if (!fs.existsSync(webui.staticPath)) {
      throw new Error(
        `Interactive UI not found at ${webui.staticPath}. Make sure web UI is built and static files are available.`,
      );
    }
  } else {
    // TODO: implement remote web ui
    throw new Error(`Unsupported web ui type: ${webui.type}`);
  }

  // Create and start the server with injected agent
  const server = new AgentServer(agentServerInitOptions);
  const httpServer = await server.start();

  // Set up UI if static path is provided
  if (webui.staticPath) {
    const app = server.getApp();
    const mergedWebUIConfig = mergeWebUIConfig(webui, server);
    setupUI(app, isDebug, webui.staticPath, mergedWebUIConfig);
  }

  const port = appConfig.server!.port!;
  const serverUrl = `http://localhost:${port}`;

  if (appConfig.logLevel !== LogLevel.SILENT) {
    // Define brand colors
    const brandColor1 = '#4d9de0';
    const brandColor2 = '#7289da';
    const brandGradient = gradient(brandColor1, brandColor2);
    const workspaceDir = toUserFriendlyPath(server.getCurrentWorkspace());
    const provider = appConfig.model?.provider;
    const modelId = appConfig.model?.id;

    const boxContent = [
      `🎉 ${chalk.underline(chalk.bgBlue(` ${chalk.bold(server.getCurrentAgentName())} `))}` +
        brandGradient.multiline(` is available at: `, {
          interpolation: 'hsv',
        }) +
        chalk.underline(brandGradient(serverUrl)),
      '',
      `📁 ${chalk.gray('Workspace:')} ${brandGradient(workspaceDir)}`,
      '',
      `🤖 ${chalk.gray('Model:')} ${appConfig.model?.provider ? brandGradient(`${provider} | ${modelId}`) : chalk.gray('Not specified')}`,
    ].join('\n');

    console.log(
      boxen(boxContent, {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderColor: brandColor2,
        borderStyle: 'classic',
        dimBorder: true,
      }),
    );

    if (options.open) {
      const url = `http://localhost:${port}`;
      const command =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
      exec(`${command} ${url}`, (err) => {
        if (err) {
          console.error(`Failed to open browser: ${err.message}`);
        }
      });
    }
  }

  return httpServer;
}

/**
 * Configure Express app to serve UI files
 */
function setupUI(
  app: express.Application,
  isDebug = false,
  staticPath: string,
  mergedWebUIConfig: AgentWebUIImplementation & Record<string, any>,
): void {
  if (isDebug) {
    logger.debug(`Using static files from: ${staticPath}`);
  }

  const pathMatcher = createPathMatcher(mergedWebUIConfig.base);
  const staticFilePattern = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/;

  const injectConfig = (htmlContent: string): string => {
    const scriptTag = `<script>
      window.AGENT_BASE_URL = "";
      window.AGENT_WEB_UI_CONFIG = ${JSON.stringify(mergedWebUIConfig)};
      console.log("Agent: Using API baseURL:", window.AGENT_BASE_URL);
    </script>`;
    return htmlContent.replace('</head>', `${scriptTag}\n</head>`);
  };

  const serveIndexWithConfig = (res: express.Response): void => {
    const indexPath = path.join(staticPath, 'index.html');
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    res.send(injectConfig(htmlContent));
  };

  app.get('*', (req, res, next) => {
    if (!pathMatcher.test(req.path)) {
      return next();
    }

    const extractedPath = pathMatcher.extract(req.path);

    // Serve static files directly
    if (staticFilePattern.test(extractedPath)) {
      const filePath = path.join(staticPath, extractedPath);
      return fs.existsSync(filePath) ? res.sendFile(filePath) : next();
    }

    // Skip API routes
    if (extractedPath.startsWith('/api/')) {
      return next();
    }

    // Serve index.html with injected config for all other routes (SPA)
    serveIndexWithConfig(res);
  });
}
