/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import { registerAllRoutes } from './routes';

/**
 * Get default CORS options if none are provided
 *
 * TODO: support cors config.
 */
export function getDefaultCorsOptions(): cors.CorsOptions {
  return {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

/**
 * Setup API middleware and routes
 * @param app Express application instance
 * @param options Server options
 */
export function setupAPI(app: express.Application) {
  // Apply CORS middleware
  app.use(cors(getDefaultCorsOptions()));

  // Apply JSON body parser middleware
  app.use(express.json({ limit: '20mb' }));

  // Register all API routes
  registerAllRoutes(app);
}
