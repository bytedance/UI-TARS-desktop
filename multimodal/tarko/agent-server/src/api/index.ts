import express from 'express';
import cors from 'cors';
import { registerAllRoutes } from './routes';
import { setupWorkspaceStaticServer } from '../utils/workspace-static-server';
import { csrfProtectionMiddleware } from './middleware/csrf-protection';
import { registerCsrfRoutes } from './routes/csrf';

/**
 * Check if an origin is allowed for CORS.
 * Allows localhost/127.0.0.1 on the server port, file:// protocol,
 * and any additional origins from TARKO_ALLOWED_ORIGINS env var.
 */
function isAllowedOrigin(origin: string | undefined, port: number): boolean {
  if (!origin) {
    // Allow requests with no Origin header (e.g., curl, same-origin)
    return true;
  }

  const allowedOrigins = new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'file://',
  ]);

  // Support additional origins via environment variable
  const extraOrigins = process.env.TARKO_ALLOWED_ORIGINS;
  if (extraOrigins) {
    for (const o of extraOrigins.split(',')) {
      const trimmed = o.trim();
      if (trimmed) {
        allowedOrigins.add(trimmed);
      }
    }
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  // Also allow file:// origins (which may have a path suffix)
  if (origin.startsWith('file://')) {
    return true;
  }

  return false;
}

/**
 * Get CORS options with origin whitelist based on server port.
 */
export function getDefaultCorsOptions(port: number): cors.CorsOptions {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isAllowedOrigin(origin, port)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  };
}

/**
 * Security headers middleware
 */
function securityHeadersMiddleware(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * Setup API middleware and routes
 * @param app Express application instance
 * @param options Server options including port for CORS configuration
 */
export function setupAPI(
  app: express.Application,
  options?: {
    workspacePath?: string;
    isDebug?: boolean;
    port?: number;
  },
) {
  const port = options?.port ?? 3000;

  // Apply security headers
  app.use(securityHeadersMiddleware);

  // Apply CORS middleware with origin whitelist
  app.use(cors(getDefaultCorsOptions(port)));

  // Apply JSON body parser middleware
  app.use(express.json({ limit: '20mb' }));

  // Register CSRF token endpoint (before CSRF protection so GET is accessible)
  registerCsrfRoutes(app);

  // Apply CSRF protection middleware (after body parser, before routes)
  app.use(csrfProtectionMiddleware);

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
