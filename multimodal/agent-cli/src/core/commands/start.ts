/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import http from 'http';
import { AgentConstructor, AgentAppConfig, LogLevel } from '@multimodal/agent-server-interface';
import { AgentServer, express } from '@multimodal/agent-server';
import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';
import { logger, toUserFriendlyPath } from '../../utils';

interface UIServerOptions {
  appConfig: AgentAppConfig;
  isDebug?: boolean;
  open?: boolean;
  agentConstructor: AgentConstructor;
  agentName: string;
  staticPath?: string;
  extraOptions?: any;
}

/**
 * Start the Agent Server with UI capabilities
 */
export async function startInteractiveWebUI(options: UIServerOptions): Promise<http.Server> {
  const { appConfig, isDebug, agentConstructor, agentName, staticPath, extraOptions } = options;

  // Ensure server config exists with defaults
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  if (appConfig.workspace.isolateSessions === undefined) {
    appConfig.workspace.isolateSessions = false;
  }

  // Set up static path if provided
  if (staticPath) {
    if (!fs.existsSync(staticPath)) {
      throw new Error(
        'Interactive UI not found. Make sure web UI is built and static files are available.',
      );
    }

    if (!appConfig.ui) {
      appConfig.ui = {};
    }

    appConfig.ui.staticPath = staticPath;
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

  // Set up UI if static path is provided
  if (staticPath) {
    const app = server.getApp();
    setupUI(app, appConfig.server!.port!, isDebug, staticPath);
  }

  const port = appConfig.server!.port!;
  const serverUrl = `http://localhost:${port}`;

  if (appConfig.logLevel !== LogLevel.SILENT) {
    // Define brand colors
    const brandColor1 = '#4d9de0';
    const brandColor2 = '#7289da';

    const brandGradient = gradient(brandColor1, brandColor2);

    const workspaceDir = appConfig.workspace?.workingDirectory
      ? toUserFriendlyPath(appConfig.workspace.workingDirectory)
      : 'Not specified';
    const provider = appConfig.model?.provider;
    const modelId = appConfig.model?.id;

    const boxContent = [
      brandGradient.multiline(`🎉 ${agentName} is available at: `, {
        interpolation: 'hsv',
      }) + chalk.underline(brandGradient(serverUrl)),
      '',
      `📁 ${chalk.gray('Workspace:')} ${brandGradient(workspaceDir)} ${chalk.dim('(browse at /')}`,
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
  port: number,
  isDebug = false,
  staticPath: string,
): void {
  if (isDebug) {
    logger.debug(`Using static files from: ${staticPath}`);
  }

  // Middleware to inject baseURL for HTML requests
  const injectBaseURL = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (!req.path.endsWith('.html') && req.path !== '/' && !req.path.match(/^\/[^.]*$/)) {
      return next();
    }

    const indexPath = path.join(staticPath, 'index.html');
    let htmlContent = fs.readFileSync(indexPath, 'utf8');

    const scriptTag = `<script>
      window.AGENT_BASE_URL = "";
      console.log("Agent: Using API baseURL:", window.AGENT_BASE_URL);
    </script>`;

    htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);
    res.send(htmlContent);
  };

  // Handle root path and client-side routes
  app.get('/', injectBaseURL);

  app.get(/^\/[^.]*$/, (req, res, next) => {
    if (
      req.path.includes('.') &&
      !req.path.endsWith('.html') &&
      !req.path.startsWith('/static/') &&
      !req.path.startsWith('/assets/') &&
      !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
    ) {
      return next();
    }

    injectBaseURL(req, res, next);
  });

  // Serve static files
  app.use((req, res, next) => {
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
      const filePath = path.join(staticPath, req.path);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    next();
  });

  // Fallback to index.html for SPA routes
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.') && !req.path.startsWith('/api/')) {
      return injectBaseURL(req, res, next);
    }
    next();
  });
}
