import express from 'express';
import { registerSessionRoutes } from './sessions';
import { registerQueryRoutes } from './queries';
import { registerSystemRoutes } from './system';
import { registerShareRoutes } from './share';

/**
 * Register all API routes with the Express application
 * @param app Express application
 */
export function registerAllRoutes(app: express.Application): void {
  registerSessionRoutes(app);
  registerQueryRoutes(app);
  registerSystemRoutes(app);
  registerShareRoutes(app);
}
