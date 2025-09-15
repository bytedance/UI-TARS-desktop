/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { LogLevel, SessionInfo, TenantConfig } from '@tarko/interface';
import { StorageProvider, createStorageProvider } from './storage';
import { resolveAgentImplementation } from './utils/agent-resolver';
import type {
  AgentServerVersionInfo,
  AgentServerInitOptions,
  AgentAppConfig,
  AgentResolutionResult,
  AgioProviderConstructor,
  IAgent,
  ContextVariables,
} from './types';
import { AgentSessionPool, AgentSessionFactory } from './services/session';
import { SandboxScheduler } from './services/sandbox';
import { UserConfigService } from './services/user';
import { MongoDBStorageProvider } from './storage/MongoDBStorageProvider';
import { authMiddleware } from './middlewares/auth';
import { TARKO_CONSTANTS, GlobalDirectoryOptions } from '@tarko/interface';
import { requestIdMiddleware, accessLogMiddleware, errorHandlingMiddleware } from './middlewares';
import {
  createQueryRoutes,
  createSessionRoutes,
  createShareRoutes,
  createSystemRoutes,
} from './routes';
import { createUserConfigRoutes } from './routes/user';
import { config } from 'dotenv';

config();
/**
 * AgentServer - Generic server class for any Agent implementation using Hono
 *
 * This class orchestrates all server components including:
 * - Hono application and HTTP server
 * - API endpoints
 * - Session management
 * - Storage integration
 * - AGIO monitoring integration
 * - Generic Agent dependency injection
 */
export class AgentServer<T extends AgentAppConfig = AgentAppConfig> {
  // Core server components
  private app: Hono<{ Variables: ContextVariables }>;
  private server: any; // Node.js HTTP server

  // Server state
  private isRunning = false;

  // Session management
  public storageUnsubscribes: Record<string, () => void> = {};
  private sessionPool: AgentSessionPool;
  private sessionFactory: AgentSessionFactory;
  private sandboxScheduler?: SandboxScheduler;
  public userConfigService?: UserConfigService;

  // Configuration
  public readonly port: number;
  public readonly isDebug: boolean;
  public readonly isExclusive: boolean;
  public readonly storageProvider: StorageProvider;
  public readonly appConfig: T;
  public readonly versionInfo?: AgentServerVersionInfo;
  public readonly directories: Required<GlobalDirectoryOptions>;
  public readonly tenantConfig: TenantConfig;

  // Exclusive mode state
  private runningSessionId: string | null = null;

  // Current agent resolution, resolved before server started
  private currentAgentResolution?: AgentResolutionResult;

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
    this.tenantConfig = appConfig.server?.tenant || { mode: 'single', auth: false };

    // Initialize Hono app
    this.app = new Hono<{ Variables: ContextVariables }>();

    // Initialize storage
    this.storageProvider = createStorageProvider(appConfig.server?.storage || { type: 'sqlite' });

    // Initialize session management
    this.sessionPool = new AgentSessionPool({
      maxSessions: (appConfig.server as any)?.maxSessions,
      memoryLimitMB: (appConfig.server as any)?.memoryLimitMB,
      checkIntervalMs: (appConfig.server as any)?.checkIntervalMs,
    });

    // Initialize session factory
    this.sessionFactory = new AgentSessionFactory(this);

    // Setup middlewares in correct order
    this.setupMiddlewares();
  }

  /**
   * Setup Hono middlewares in correct order
   */
  private setupMiddlewares(): void {
    // CORS middleware (should be early to handle preflight requests)
    this.app.use(
      '*',
      cors({
        origin: process.env.ACCESS_ALLOW_ORIGIN || '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
      }),
    );

    // Server instance injection middleware
    this.app.use('*', async (c, next) => {
      c.set('server', this);
      await next();
    });

    // Error handling middleware (after CORS to catch all errors)
    this.app.use('*', errorHandlingMiddleware);

    // Request ID middleware (early for logging)
    this.app.use('*', requestIdMiddleware);

    // Logging middleware (after request ID)
    this.app.use('*', accessLogMiddleware);

    // Authentication middleware (for multi-tenant mode)
    this.app.use('*', authMiddleware);
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Register all API routes
    this.app.route('/', createQueryRoutes());
    this.app.route('/', createSessionRoutes());
    this.app.route('/', createShareRoutes());
    this.app.route('/', createSystemRoutes());

    // Register user config routes for multi-tenant mode
    if (this.isMultiTenant()) {
      this.app.route('/', createUserConfigRoutes());
    }

    // Add a catch-all route for undefined endpoints
    this.app.notFound((c) => {
      return c.json(
        {
          error: 'Not Found',
          message: 'The requested endpoint was not found',
          path: c.req.path,
          method: c.req.method,
        },
        404,
      );
    });
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
  createAgentWithSessionModel(sessionInfo?: SessionInfo): IAgent {
    let modelConfig = this.getDefaultModelConfig();

    // If session has specific model config and it's still valid, use session config
    if (sessionInfo?.metadata?.modelConfig) {
      const { provider, modelId } = sessionInfo.metadata.modelConfig;
      if (this.isModelConfigValid(provider, modelId)) {
        modelConfig = { provider, modelId };
      } else {
        console.warn(`Session ${sessionInfo.id} model config is invalid, falling back to default`);
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
   * Get the Hono application instance
   * @returns Hono application
   */
  getApp(): Hono<{ Variables: ContextVariables }> {
    return this.app;
  }

  /**
   * Get the HTTP server instance
   * @returns HTTP server
   */
  getHttpServer(): any {
    return this.server;
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

    if (this.storageProvider.constructor.name === 'SQLiteStorageProvider') {
      return {
        type: 'sqlite',
        path: (this.storageProvider as any).dbPath,
      };
    }

    // For other storage types
    return {
      type: this.storageProvider.constructor.name.replace('StorageProvider', '').toLowerCase(),
    };
  }

  /**
   * Start the server on the configured port
   * @returns Promise resolving when server is started
   */
  async start(): Promise<void> {
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

    // Initialize multi-tenant services if in multi-tenant mode
    if (this.isMultiTenant()) {
      await this.initializeMultiTenantServices();
    }

    // Setup API routes
    this.setupRoutes();

    // Start the server
    this.server = serve({
      fetch: this.app.fetch,
      port: this.port,
    });

    this.isRunning = true;
    console.log(`Server started on port ${this.port}`);
  }

  /**
   * Initialize multi-tenant services
   */
  private async initializeMultiTenantServices(): Promise<void> {
    if (!this.appConfig.server?.sandbox) {
      throw new Error('Sandbox config must be specified in multi-tenant mode');
    }

    try {
      // Ensure we have MongoDB storage for multi-tenant mode
      if (!(this.storageProvider instanceof MongoDBStorageProvider)) {
        throw new Error('Multi-tenant mode requires MongoDB storage provider');
      }

      this.userConfigService = new UserConfigService(this.storageProvider);

      this.sandboxScheduler = new SandboxScheduler({
        sandboxConfig: this.appConfig.server.sandbox,
        storageProvider: this.storageProvider,
      });

      // Update session factory with sandbox scheduler
      this.sessionFactory.setSandboxScheduler(this.sandboxScheduler);

      console.log('Multi-tenant services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize multi-tenant services:', error);
    }
  }

  /**
   * Stop the server and clean up all resources
   * @returns Promise resolving when server is stopped
   */
  async stop(): Promise<void> {
    // Clean up session pool
    await this.sessionPool.cleanup();

    // Clean up all storage unsubscribes
    Object.values(this.storageUnsubscribes).forEach((unsubscribe) => unsubscribe());
    this.storageUnsubscribes = {};

    // Close storage provider
    if (this.storageProvider) {
      await this.storageProvider.close();
    }

    // Close server if running
    if (this.isRunning && this.server) {
      // Note: @hono/node-server doesn't provide a close method in the current version
      // This will depend on the implementation details
      this.isRunning = false;
    }
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

  /**
   * Get session manager instance
   */
  getSessionPool(): AgentSessionPool {
    return this.sessionPool;
  }

  /**
   * Get session factory instance
   */
  getSessionFactory(): AgentSessionFactory {
    return this.sessionFactory;
  }

  /**
   * Check if server is in multi-tenant mode
   */
  isMultiTenant(): boolean {
    return this.tenantConfig.mode === 'multi';
  }

  /**
   * Get memory statistics from session manager
   */
  getMemoryStats() {
    return this.sessionPool.getMemoryStats();
  }
}
