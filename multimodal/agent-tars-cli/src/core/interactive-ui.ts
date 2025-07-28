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
import { logger, toUserFriendlyPath } from '../utils';
import { getBootstrapCliOptions } from './state';

interface UIServerOptions {
  appConfig: AgentAppConfig;
  isDebug?: boolean;
  open?: boolean;
  agentConstructor: AgentConstructor;
  agentName: string;
}

/**
 * Start the Agent Server with UI capabilities
 */
export async function startInteractiveWebUI(options: UIServerOptions): Promise<http.Server> {
  const { appConfig, isDebug, agentConstructor, agentName } = options;

  // Ensure server config exists with defaults
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  // isolateSessions defaults to false unless explicitly set
  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  if (appConfig.workspace.isolateSessions === undefined) {
    appConfig.workspace.isolateSessions = false;
  }

  // Use the interactive UI
  const staticPath = path.resolve(__dirname, '../static');

  // Check if interactive UI is available
  if (!fs.existsSync(staticPath)) {
    throw new Error(
      'Interactive UI not found. Make sure agent-tars-web-ui is built and static files are available.',
    );
  }

  if (!appConfig.ui) {
    appConfig.ui = {};
  }

  // Set static path in server config
  appConfig.ui.staticPath = staticPath;

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

  // Get the Express app instance directly from the server
  const app = server.getApp();

  // Set up interactive UI (higher priority than workspace static server)
  setupUI(app, appConfig.server!.port!, isDebug, staticPath);

  const port = appConfig.server!.port!;
  const serverUrl = `http://localhost:${port}`;

  if (appConfig.logLevel !== LogLevel.SILENT) {
    // Define brand colors from the logo
    const brandColor1 = '#4d9de0'; // AGENT blue
    const brandColor2 = '#7289da'; // TARS purplish-blue

    // Create a gradient
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

      // A simple cross-platform way to open a URL
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
 * Configure Express app to serve UI files with highest priority
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

  // Middleware to inject baseURL for HTML requests (highest priority)
  const injectBaseURL = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Only handle HTML requests for web UI (not workspace files)
    if (!req.path.endsWith('.html') && req.path !== '/' && !req.path.match(/^\/[^.]*$/)) {
      return next();
    }

    // Read the original HTML file
    const indexPath = path.join(staticPath, 'index.html');
    let htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Inject baseURL as a global variable
    const scriptTag = `<script>
      window.AGENT_TARS_BASE_URL = "";
      console.log("AGENT_TARS: Using API baseURL:", window.AGENT_TARS_BASE_URL);
    </script>`;

    // Insert the script tag right before the closing </head> tag
    htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);

    // Send the modified HTML
    res.send(htmlContent);
  };

  // Handle root path and all client-side routes with highest priority
  app.get('/', injectBaseURL);

  // Handle direct access to client-side routes (for SPA) with high priority
  app.get(/^\/[^.]*$/, (req, res, next) => {
    // Skip workspace file requests (files with extensions that aren't common web UI routes)
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

  // Serve other static files from UI
  app.use((req, res, next) => {
    // Only handle requests that look like UI assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
      const filePath = path.join(staticPath, req.path);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    next();
  });

  // Fallback to index.html for any unmatched SPA routes (lower priority than workspace)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.') && !req.path.startsWith('/api/')) {
      // Only handle web UI routes, not workspace file requests
      return injectBaseURL(req, res, next);
    }
    next();
  });
}
