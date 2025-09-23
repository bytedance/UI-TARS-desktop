/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { LogLevel, TenantConfig } from '@tarko/interface';
import { IDAOFactory, createDAOFactory } from './dao';
import { resolveAgentImplementation } from './utils/agent-resolver';
import type {
  AgentServerVersionInfo,
  AgentServerInitOptions,
  AgentAppConfig,
  AgentResolutionResult,
  AgioProviderConstructor,
  ContextVariables,
  ILogger,
} from './types';
import { AgentSessionPool, AgentSessionFactory } from './services/session';
import { SandboxScheduler } from './services/sandbox';
import { UserConfigService } from './services/user';
import { MongoDAOFactory } from './dao/mongodb/MongoDAOFactory';
import { TARKO_CONSTANTS, GlobalDirectoryOptions } from '@tarko/interface';
import {
  createQueryRoutes,
  createSessionRoutes,
  createShareRoutes,
  createSystemRoutes,
} from './routes';
import { createUserConfigRoutes } from './routes/user';
import { HookManager, BuiltInPriorities, type HookRegistrationOptions } from './hooks';
import { config } from 'dotenv';
import { ContextStorageHook, ErroHandlingHook, RequestIdHook } from './hooks/builtInHooks';
import { resetLogger } from './utils/logger';
import chalk from 'chalk';

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
  private app: Hono<{ Variables: ContextVariables }>;
  private server: any;
  private isRunning = false;

  // Session management
  public storageUnsubscribes: Record<string, () => void> = {};
  private sessionPool: AgentSessionPool;
  private sessionFactory?: AgentSessionFactory;
  private sandboxScheduler?: SandboxScheduler;
  public userConfigService?: UserConfigService;

  // Configuration
  public readonly port: number;
  public readonly isDebug: boolean;
  public readonly isExclusive: boolean;
  public readonly daoFactory: IDAOFactory;
  public readonly appConfig: T;
  public readonly versionInfo?: AgentServerVersionInfo;
  public readonly directories: Required<GlobalDirectoryOptions>;
  public readonly tenantConfig: TenantConfig;

  // Exclusive mode state
  private runningSessionId: string | null = null;

  // Current agent resolution, resolved before server started
  private currentAgentResolution?: AgentResolutionResult;

  // Hook system
  public readonly hookManager: HookManager;

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

    // Initialize DAO factory
    this.daoFactory = createDAOFactory(appConfig.server?.storage || { type: 'sqlite' });

    // Initialize session management
    this.sessionPool = new AgentSessionPool();

    // Initialize hook system
    this.hookManager = new HookManager();

    // Setup middlewares in correct order
    this.setupMiddlewares();
  }

  /**
   * Setup Hono middlewares - only register hooks, don't apply yet
   */
  private setupMiddlewares(): void {
    this.hookManager.register({
      id: 'server-injection',
      name: 'Server Injection',
      priority: BuiltInPriorities.SERVER_INJECTION,
      description: 'Injects server instance into context',
      handler: async (c, next) => {
        c.set('server', this);
        await next();
      },
    });

    this.hookManager.register(ErroHandlingHook);
    this.hookManager.register(RequestIdHook);
  }


  /**
   * Apply all registered hooks to the Hono app in priority order
   * This method is called during server start after all hooks are registered
   */
  private applyHooks(): void {
    // Get all hooks sorted by priority (highest first)
    const hooks = this.hookManager.getHooks();
    
    if (hooks.length === 0) {
      console.warn('No hooks registered. Server will run without middleware.');
      return;
    }
    
    // Validate hook configuration
    const validation = this.hookManager.validateExecutionOrder();
    if (!validation.isValid) {
      console.warn('Hook validation warnings detected:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    
    for (const hook of hooks) {
        console.log(chalk.green(`[Hook] ${hook.name} (id: ${hook.id}, priority: ${hook.priority})`));
        this.app.use('*', hook.handler);
    }
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
   * Get the current agent resolution.
   */
  getCurrentAgentResolution(): AgentResolutionResult | undefined {
    return this.currentAgentResolution;
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
    if (!this.daoFactory) {
      return { type: 'none' };
    }

    if (this.daoFactory.constructor.name === 'SQLiteDAOFactory') {
      return {
        type: 'sqlite',
        path: (this.daoFactory as any).dbPath,
      };
    }

    return {
      type: this.daoFactory.constructor.name.replace('DAOFactory', '').toLowerCase(),
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

    await this.daoFactory.initialize();

    // Initialize session factory
    this.sessionFactory = new AgentSessionFactory(this);

    // Initialize multi-tenant services if in multi-tenant mode
    if (this.isMultiTenant()) {
      await this.initializeMultiTenantServices();
    }

    // Apply all registered hooks in priority order
    this.applyHooks();

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
      // Ensure we have MongoDB DAO factory for multi-tenant mode
      if (!(this.daoFactory instanceof MongoDAOFactory)) {
        throw new Error('Multi-tenant mode requires MongoDB DAO factory');
      }

      this.userConfigService = new UserConfigService(this.daoFactory);

      this.sandboxScheduler = new SandboxScheduler({
        sandboxConfig: this.appConfig.server.sandbox,
        daoFactory: this.daoFactory,
      });

      // Update session factory with sandbox scheduler
      this.sessionFactory?.setSandboxScheduler(this.sandboxScheduler);

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

    // Close DAO factory
    if (this.daoFactory) {
      await this.daoFactory.close();
    }

    // Close server if running
    if (this.isRunning && this.server) {
      // Note: @hono/node-server doesn't provide a close method in the current version
      // This will depend on the implementation details
      this.isRunning = false;
    }
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
    if (!this.sessionFactory) {
      this.sessionFactory = new AgentSessionFactory(this);
    }
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

  /**
   * Register a custom hook/middleware
   * @param options Hook registration options
   */
  registerHook(options: HookRegistrationOptions): void {
    if (this.isRunning) {
      throw new Error(
        `Cannot register hook '${options.id}' after server has started. ` +
        'Please register all hooks before calling start().'
      );
    }
    
    this.hookManager.register(options);
    
    if (this.isDebug) {
      console.log(`[DEBUG] Registered hook: ${options.name} (id: ${options.id}, priority: ${options.priority || 200})`);
    }
  }

  /**
   * Unregister a hook by id
   * @param id Hook identifier
   * @returns true if hook was found and removed
   */
  unregisterHook(id: string): boolean {
    if (this.isRunning) {
      throw new Error(
        `Cannot unregister hook '${id}' after server has started. ` +
        'Please manage hooks before calling start().'
      );
    }
    
    const result = this.hookManager.unregister(id);
    
    if (result && this.isDebug) {
      console.log(`[DEBUG] Unregistered hook: ${id}`);
    }
    
    return result;
  }

  /**
   * Reset Root Logger in server
   */
  setLogger(logger: ILogger) {
    resetLogger(logger);
  }
}