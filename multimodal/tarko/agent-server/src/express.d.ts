import 'express';
import { AgentServer } from './server';
import { AgentSession } from './core';

declare global {
  namespace Express {
    interface Locals {
      server: AgentServer;
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
