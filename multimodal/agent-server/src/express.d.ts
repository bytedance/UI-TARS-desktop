import 'express';
import { AgentTARSServer } from './server';
import { AgentSession } from './core';

declare global {
  namespace Express {
    interface Locals {
      server: AgentTARSServer;
    }

    interface Request {
      session?: AgentSession;
    }

    interface Application {
      group(
        prefix: string,
        ...handlers: (express.RequestHandler | ((router: express.Router) => void))[]
      ): void;
    }
  }
}
