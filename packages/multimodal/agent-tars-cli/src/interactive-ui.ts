/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import express from 'express';
import http from 'http';
import { AgentTARSServer, ServerOptions } from '@agent-tars/server';

interface UIServerOptions extends ServerOptions {
  uiMode: 'none' | 'plain' | 'interactive';
}

/**
 * Start the Agent TARS server with UI capabilities
 */
export async function startInteractiveWebUI(options: UIServerOptions): Promise<http.Server> {
  const { port, uiMode } = options;

  // Create and start the server
  const tarsServer = new AgentTARSServer({ port });
  const server = await tarsServer.start();

  // If UI mode is none, return the base server
  if (uiMode === 'none') {
    return server;
  }

  // Get the Express app instance directly from the server
  const app = tarsServer.getApp();

  // Set up UI based on mode
  setupUI(app, uiMode);

  return server;
}

/**
 * Configure Express app to serve UI files
 */
function setupUI(app: express.Application, uiMode: 'plain' | 'interactive'): void {
  // Determine which UI to serve
  let staticPath: string;

  if (uiMode === 'interactive') {
    staticPath = path.resolve(__dirname, '../../../agent-tars-web-ui/dist');
    // Check if interactive UI is available
    if (!fs.existsSync(staticPath)) {
      console.warn('Interactive UI not found, falling back to plain UI');
      staticPath = path.resolve(__dirname, '../static');
    }
  } else {
    // Plain/debug UI
    staticPath = path.resolve(__dirname, '../static');
  }

  console.log(`Serving ${uiMode} UI from: ${staticPath}`);

  // Serve static files
  app.use(express.static(staticPath));

  // Handle homepage request
  app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}
