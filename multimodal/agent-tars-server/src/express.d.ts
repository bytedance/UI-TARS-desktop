import 'express';
import { AgentTARSServer } from './server';

declare global {
  namespace Express {
    interface Locals {
      server: AgentTARSServer;
    }
  }
}
