/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import http from 'http';
import { AgentTARSAppConfig } from '@agent-tars/interface';
import { AgentTARSServer, express } from '@agent-tars/server';
import { logger } from '../utils';
import { getBootstrapCliOptions } from './state';

interface UIServerOptions {
  appConfig: AgentTARSAppConfig;
  isDebug?: boolean;
}

/**
 * Start the Agent TARS server with UI capabilities
 */
export async function startInteractiveWebUI(options: UIServerOptions): Promise<http.Server> {
  const { appConfig, isDebug } = options;

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
  const staticPath = path.resolve(__dirname, '../../static');

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

  // Create and start the server with config
  const tarsServer = new AgentTARSServer(appConfig as Required<AgentTARSAppConfig>, {
    agioProvider: getBootstrapCliOptions().agioProvider,
  });
  const server = await tarsServer.start();

  // Get the Express app instance directly from the server
  const app = tarsServer.getApp();

  // Set up interactive UI
  setupUI(app, appConfig.server.port!, isDebug, staticPath);

  return server;
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
    // Only handle HTML requests
    if (!req.path.endsWith('.html') && req.path !== '/' && !req.path.match(/^\/[^.]*$/)) {
      return next();
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const baseURL = `${protocol}://${host}`;

    // Read the original HTML file
    const indexPath = path.join(staticPath, 'index.html');
    let htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Inject baseURL as a global variable
    const scriptTag = `<script>
      window.AGENT_TARS_BASE_URL = "${baseURL}";
      console.log("AGENT_TARS: Using API baseURL:", window.AGENT_TARS_BASE_URL);
    </script>`;

    // Insert the script tag right before the closing </head> tag
    htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);

    // Send the modified HTML
    res.send(htmlContent);
  };

  // Handle root path and all client-side routes
  app.get('/', injectBaseURL);

  // Handle direct access to client-side routes (for SPA)
  app.get(/^\/[^.]*$/, injectBaseURL);

  // Serve static files
  app.use(express.static(staticPath));

  // Fallback to index.html for any unmatched routes (important for SPA routing)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.')) {
      return injectBaseURL(req, res, next);
    }
    next();
  });
}
