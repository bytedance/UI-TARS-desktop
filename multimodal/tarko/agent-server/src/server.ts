/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setupAPI } from './api';
import { LogLevel } from '@tarko/interface';
import { StorageProvider, createStorageProvider } from './storage';
import { setupSocketIO } from './core/SocketHandlers';
import type { AgentSession } from './core';
import { resolveAgentImplementation } from './utils/agent-resolver';
import type {
  AgentServerVersionInfo,
  AgentServerInitOptions,
  AgentAppConfig,
  AgentResolutionResult,
  AgioProviderConstructor,
  IAgent,
} from './types';
import { TARKO_CONSTANTS, GlobalDirectoryOptions } from '@tarko/interface';

export { express };

/**
 * AgentServer - Generic server class for any Agent implementation
 *
 * This class orchestrates all server components including:
 * - Express application and HTTP server
 * - API endpoints
 * - WebSocket communication
 * - Session management
 * - Storage integration
 * - AGIO monitoring integration
 * - Workspace static file serving
 * - Generic Agent dependency injection
 */
export class AgentServer<T extends AgentAppConfig = AgentAppConfig> {
  // Core server components
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer; // Socket.IO server

  // Server state
  private isRunning = false;

  // Session management
  public sessions: Record<string, AgentSession> = {};
  public storageUnsubscribes: Record<string, () => void> = {};

  // Configuration
  public readonly port: number;
  public readonly isDebug: boolean;
  public readonly isExclusive: boolean;
  public readonly storageProvider: StorageProvider | null = null;
  public readonly appConfig: T;
  public readonly versionInfo?: AgentServerVersionInfo;
  public readonly directories: Required<GlobalDirectoryOptions>;

  // Exclusive mode state
  private runningSessionId: string | null = null;

  // Current agent resolution, resolved before server started
  private currentAgentResolution?: AgentResolutionResult;

  // Server information

  constructor(instantiationOptions: AgentServerInitOptions<T>) {
    const { appConfig, versionInfo, directories } = instantiationOptions;

    // Store injected Agent constructor and options
    this.appConfig = appConfig;

    // Store version info
    this.versionInfo = versionInfo;

    // Initialize directories with defaults
    this.directories = {
      globalWorkspaceDir: directories?.globalWorkspaceDir || TARKO_CONSTANTS.GLOBAL_WORKSPACE_DIR,
    };

    // Extract server configuration from agent options
    this.port = appConfig.server?.port ?? 3000;
    this.isDebug = appConfig.logLevel === LogLevel.DEBUG;
    this.isExclusive = appConfig.server?.exclusive ?? false;

    // Initialize Express app and HTTP server
    this.app = express();
    this.server = http.createServer(this.app);

    // Initialize storage if provided
    if (appConfig.server?.storage) {
      this.storageProvider = createStorageProvider(appConfig.server.storage);
    }

    // Setup API routes and middleware (includes workspace static server)
    setupAPI(this.app, {
      workspacePath: this.getCurrentWorkspace(),
      isDebug: this.isDebug,
    });

    // Setup WebSocket functionality
    this.io = setupSocketIO(this.server, this);

    // Make server instance available to request handlers
    this.app.locals.server = this;
  }

  /**
   * Get the custom AGIO provider if injected
   * @returns Custom AGIO provider or undefined
   */
  getCustomAgioProvider(): AgioProviderConstructor | undefined {
    return this.currentAgentResolution?.agioProviderConstructor;
  }

  /**
   * Get the Web UI config from Agent Constructor
   * @returns Web UI config or undefined
   */
  getAgentConstructorWebConfig(): Record<string, any> | undefined {
    return this.currentAgentResolution?.agentConstructor.webuiConfig;
  }

  /**
   * Get the label of current agent
   */
  getCurrentWorkspace(): string {
    if (!this.appConfig?.workspace) {
      throw new Error('Workspace not specified');
    }
    return this.appConfig.workspace;
  }

  /**
   * Get the label of current agent
   */
  getCurrentAgentName(): string | undefined {
    return this.currentAgentResolution?.agentName;
  }

  /**
   * Get currently available model providers
   */
  getAvailableModels(): Array<{ name: string; models: string[]; baseURL?: string }> {
    const providers = this.appConfig.model?.providers || [];

    // Convert new format to legacy format for API compatibility
    return providers.map((provider) => ({
      name: provider.name,
      models: provider.models.map((model) => (typeof model === 'string' ? model : model.id)),
      baseURL: provider.baseURL,
    }));
  }

  /**
   * Validate if a model configuration is still valid
   */
  isModelConfigValid(provider: string, modelId: string): boolean {
    const providers = this.appConfig.model?.providers || [];
    return providers.some(
      (p) =>
        p.name === provider &&
        p.models.some((model) =>
          typeof model === 'string' ? model === modelId : model.id === modelId,
        ),
    );
  }

  /**
   * Get default model configuration
   */
  getDefaultModelConfig(): { provider: string; modelId: string } {
    return {
      provider: this.appConfig.model?.provider || '',
      modelId: this.appConfig.model?.id || '',
    };
  }

  /**
   * Check if server can accept new requests in exclusive mode
   */
  canAcceptNewRequest(): boolean {
    if (!this.isExclusive) {
      return true;
    }
    return this.runningSessionId === null;
  }

  /**
   * Set running session for exclusive mode
   */
  setRunningSession(sessionId: string): void {
    if (this.isExclusive) {
      this.runningSessionId = sessionId;
      if (this.isDebug) {
        console.log(`[DEBUG] Session started: ${sessionId}`);
      }
    }
  }

  /**
   * Clear running session for exclusive mode
   */
  clearRunningSession(sessionId: string): void {
    if (this.isExclusive && this.runningSessionId === sessionId) {
      this.runningSessionId = null;
      if (this.isDebug) {
        console.log(`[DEBUG] Session ended: ${sessionId}`);
      }
    }
  }

  /**
   * Get current running session ID
   */
  getRunningSessionId(): string | null {
    return this.runningSessionId;
  }

  /**
   * Create Agent with session-specific model configuration
   */
  createAgentWithSessionModel(sessionInfo?: import('./storage').SessionInfo): IAgent {
    let modelConfig = this.getDefaultModelConfig();

    // If session has specific model config and it's still valid, use session config
    if (sessionInfo?.metadata?.modelConfig) {
      const { provider, modelId } = sessionInfo.metadata.modelConfig;
      if (this.isModelConfigValid(provider, modelId)) {
        modelConfig = { provider, modelId };
      } else {
        console.warn(
          `Session ${sessionInfo.id} model config is invalid, falling back to default`,
        );
      }
    }

    const agentAppOptionsWithModelConfig: T = {
      ...this.appConfig,
      name: this.getCurrentAgentName(),
      model: {
        ...this.appConfig.model,
        provider: modelConfig.provider,
        id: modelConfig.modelId,
      },
    };

    if (!this.currentAgentResolution) {
      throw new Error('Cannot found available resolved agent');
    }
    return new this.currentAgentResolution.agentConstructor(agentAppOptionsWithModelConfig);
  }

  /**
   * Get the Express application instance
   * @returns Express application
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the HTTP server instance
   * @returns HTTP server
   */
  getHttpServer(): http.Server {
    return this.server;
  }

  /**
   * Get the Socket.IO server instance
   * @returns Socket.IO server
   */
  getSocketIOServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Check if the server is currently running
   * @returns True if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get storage information if available
   * @returns Object containing storage type and path (if applicable)
   */
  getStorageInfo(): { type: string; path?: string } {
    if (!this.storageProvider) {
      return { type: 'none' };
    }

    if (this.storageProvider.constructor.name === 'FileStorageProvider') {
      return {
        type: 'file',
        path: this.storageProvider.dbPath,
      };
    }

    if (this.storageProvider.constructor.name === 'SQLiteStorageProvider') {
      return {
        type: 'sqlite',
        path: this.storageProvider.dbPath,
      };
    }

    // For other storage types
    return {
      type: this.storageProvider.constructor.name.replace('StorageProvider', '').toLowerCase(),
    };
  }

  /**
   * Start the server on the configured port
   * @returns Promise resolving with the server instance
   */
  async start(): Promise<http.Server> {
    // Resolve agent implementation with workspace context
    const agentResolutionResult = await resolveAgentImplementation(this.appConfig.agent, {
      workspace: this.appConfig.workspace,
    });
    this.currentAgentResolution = agentResolutionResult;

    // Initialize storage if available
    if (this.storageProvider) {
      try {
        await this.storageProvider.initialize();
      } catch (error) {
        console.error('Failed to initialize storage provider:', error);
      }
    }

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        this.isRunning = true;
        resolve(this.server);
      });
    });
  }

  /**
   * Stop the server and clean up all resources
   * @returns Promise resolving when server is stopped
   */
  async stop(): Promise<void> {
    // Clean up all active sessions
    const sessionCleanup = Object.values(this.sessions).map((session) => session.cleanup());
    await Promise.all(sessionCleanup);

    // Clean up all storage unsubscribes
    Object.values(this.storageUnsubscribes).forEach((unsubscribe) => unsubscribe());
    this.storageUnsubscribes = {};

    // Clear sessions
    this.sessions = {};

    // Close storage provider
    if (this.storageProvider) {
      await this.storageProvider.close();
    }

    // Close server if running
    if (this.isRunning) {
      return new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            reject(err);
            return;
          }

          this.isRunning = false;
          resolve();
        });
      });
    }

    return Promise.resolve();
  }

  /**
   * Create a new Agent instance using the injected constructor
   * @returns New Agent instance
   */
  createAgent(): IAgent {
    if (!this.currentAgentResolution) {
      throw new Error('Cannot found availble resolved agent');
    }
    const agentOptions: T = {
      ...this.appConfig,
      name: this.getCurrentAgentName(),
    };
    return new this.currentAgentResolution.agentConstructor(agentOptions);
  }
}
