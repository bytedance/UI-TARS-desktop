import express from 'express';
import cors from 'cors';
import { registerAllRoutes } from './routes';
import { setupWorkspaceStaticServer } from '../utils/workspace-static-server';

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
export function setupAPI(
  app: express.Application,
  options?: {
    workspacePath?: string;
    isDebug?: boolean;
  },
) {
  // Apply CORS middleware
  app.use(cors(getDefaultCorsOptions()));

  // Apply JSON body parser middleware
  app.use(express.json({ limit: '20mb' }));

  // Add app.group method
  app.group = (
    prefix: string,
    ...handlers: (express.RequestHandler | ((router: express.Router) => void))[]
  ) => {
    const router = express.Router();
    const routerCallback = handlers.pop() as (router: express.Router) => void;
    const middlewares = handlers as express.RequestHandler[];

    routerCallback(router);
    app.use(prefix, ...middlewares, router);
  };

  // Register all API routes first (highest priority)
  registerAllRoutes(app);

  // Setup workspace static server (lower priority, after API routes)
  if (options?.workspacePath) {
    setupWorkspaceStaticServer(app, options.workspacePath, options.isDebug);
  }
}
