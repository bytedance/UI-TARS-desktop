import express from 'express';
import cors from 'cors';
import { registerAllRoutes } from './routes';
import { ServerOptions, getEffectiveCorsOptions } from '../models/ServerOptions';

/**
 * Setup API middleware and routes
 * @param app Express application instance
 * @param options Server options
 */
export function setupAPI(app: express.Application, options: ServerOptions) {
  // Apply CORS middleware
  app.use(cors(getEffectiveCorsOptions(options)));

  // Apply JSON body parser middleware
  app.use(express.json());

  // Register all API routes
  registerAllRoutes(app);
}
