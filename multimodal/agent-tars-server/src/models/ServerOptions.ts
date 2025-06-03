import { AgentTARSOptions } from '@agent-tars/core';
import cors from 'cors';
import { StorageOptions } from '../storage';

/**
 * ServerOptions - Configuration options for the AgentTARSServer
 *
 * Defines all customizable aspects of the server including:
 * - Network configuration (port)
 * - Agent configuration
 * - File system paths
 * - Security settings (CORS)
 * - Storage configuration
 * - Sharing capabilities
 */
export class ServerOptions {
  port: number;
  config?: AgentTARSOptions;
  workspacePath?: string;
  corsOptions?: cors.CorsOptions;
  isDebug: boolean;
  storage?: StorageOptions;
  shareProvider?: string;
  staticPath?: string;

  constructor(options: {
    port: number;
    config?: AgentTARSOptions;
    workspacePath?: string;
    corsOptions?: cors.CorsOptions;
    isDebug?: boolean;
    storage?: StorageOptions;
    shareProvider?: string;
    staticPath?: string;
  }) {
    this.port = options.port;
    this.config = options.config;
    this.workspacePath = options.workspacePath;
    this.corsOptions = options.corsOptions;
    this.isDebug = options.isDebug || false;
    this.storage = options.storage;
    this.shareProvider = options.shareProvider;
    this.staticPath = options.staticPath;
  }

  /**
   * Get default CORS options if none are provided
   */
  getDefaultCorsOptions(): cors.CorsOptions {
    return {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }

  /**
   * Get effective CORS options (user provided or defaults)
   */
  getEffectiveCorsOptions(): cors.CorsOptions {
    return this.corsOptions || this.getDefaultCorsOptions();
  }
}

export default ServerOptions;
