import express from 'express';
import { systemController } from '../controllers/system';

/**
 * Register system information routes
 * @param app Express application
 */
export function registerSystemRoutes(app: express.Application): void {
  // Health check endpoint
  app.get('/api/health', systemController.healthCheck);

  // Get model information
  app.get('/api/model-info', systemController.getModelInfo);
}
