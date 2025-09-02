/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/server.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 */
import express, { Request, Response, NextFunction, Application } from 'express';
import logger from './utils/logger.js';
import { MCPHub } from './MCPHub.js';
import {
  SSEManager,
  EventTypes,
  HubState,
  SubscriptionTypes,
} from './utils/sse-manager.js';
import {
  router,
  registerRoute,
  generateStartupMessage,
} from './utils/router.js';
import {
  ValidationError,
  ServerError,
  isMCPHubError,
  wrapError,
  MCPHubError,
} from './utils/errors.js';
import { getMarketplace } from './marketplace.js';
import { MCPServerEndpoint } from './mcp/server.js';
import { WorkspaceCacheManager } from './utils/workspace-cache.js';

const SERVER_ID = 'mcp-hub';

type ServerConfig = {
  config?: any;
  port?: number;
  autoShutdown?: boolean;
  shutdownDelay?: number;
  watch?: boolean;
};

type ServiceManagerState =
  | 'starting'
  | 'ready'
  | 'restarting'
  | 'restarted'
  | 'stopping'
  | 'stopped'
  | 'error';

interface HealthData {
  status: string;
  state: ServiceManagerState;
  server_id: string;
  version?: string;
  activeClients: number;
  timestamp: string;
  servers: any[];
  connections: any;
  mcpEndpoint?: any;
  workspaces?: {
    current: string;
    allActive: any[];
  };
}

// Create Express app
const app: Application = express();
app.use(express.json());
app.use('/api', router);

// Helper to determine HTTP status code from error type
function getStatusCode(error: MCPHubError): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof ServerError) return 500;
  if (error.code === 'SERVER_NOT_FOUND') return 404;
  if (error.code === 'SERVER_NOT_CONNECTED') return 503;
  if (error.code === 'TOOL_NOT_FOUND' || error.code === 'RESOURCE_NOT_FOUND')
    return 404;
  return 500;
}

let serviceManager: ServiceManager | null = null;
let marketplace: any = null;
let mcpServerEndpoint: MCPServerEndpoint | null = null;

class ServiceManager {
  public config: any;
  public port: number;
  public autoShutdown?: boolean;
  public shutdownDelay?: number;
  public watch?: boolean;
  public mcpHub: MCPHub | null = null;
  public server: any = null;
  public workspaceCache: WorkspaceCacheManager;
  public sseManager: SSEManager;
  public state: ServiceManagerState = 'starting';

  constructor(options: ServerConfig = {}) {
    this.config = options.config;
    this.port = options.port || 3000;
    this.autoShutdown = options.autoShutdown;
    this.shutdownDelay = options.shutdownDelay;
    this.watch = options.watch;
    this.workspaceCache = new WorkspaceCacheManager(options);
    this.sseManager = new SSEManager({
      ...options,
      workspaceCache: this.workspaceCache,
      port: this.port,
    });
    // Connect logger to SSE manager
    logger.setSseManager(this.sseManager);
  }

  isReady(): boolean {
    return this.state === HubState.READY;
  }

  getState(extraData: Record<string, any> = {}): Record<string, any> {
    return {
      state: this.state,
      server_id: SERVER_ID,
      pid: process.pid,
      port: this.port,
      timestamp: new Date().toISOString(),
      ...extraData,
    };
  }

  setState(
    newState: ServiceManagerState,
    extraData?: Record<string, any>,
  ): void {
    this.state = newState;
    this.broadcastHubState(extraData);

    // Emit state change event via MCPHub for MCP endpoint to sync tools
    if (this.mcpHub) {
      this.mcpHub.emit('hubStateChanged', { state: newState, extraData });
    }
  }

  /**
   * Broadcasts current hub state to all clients
   * @private
   */
  broadcastHubState(extraData: Record<string, any> = {}): void {
    this.sseManager.broadcast(EventTypes.HUB_STATE, this.getState(extraData));
  }

  broadcastSubscriptionEvent(
    eventType: string,
    data: Record<string, any> = {},
  ): void {
    this.sseManager.broadcast(EventTypes.SUBSCRIPTION_EVENT, {
      type: eventType,
      ...data,
    });
  }

  async initializeMCPHub(): Promise<void> {
    // Initialize workspace cache first
    logger.info('Initializing workspace cache');
    await this.workspaceCache.initialize();
    await this.workspaceCache.register(this.port, this.config);
    await this.workspaceCache.startWatching();

    // Setup workspace cache event handlers
    this.workspaceCache.on('workspacesUpdated', (workspaces: any) => {
      this.broadcastSubscriptionEvent(SubscriptionTypes.WORKSPACES_UPDATED, {
        workspaces,
      });
    });

    // Initialize marketplace second
    logger.info('Initializing marketplace catalog');
    marketplace = getMarketplace();
    await marketplace.initialize();
    logger.info(
      `Marketplace initialized with ${marketplace.cache.registry?.servers?.length || 0}`,
    );

    // Then initialize MCP Hub
    logger.info('Initializing MCP Hub');
    this.mcpHub = new MCPHub(this.config, {
      watch: this.watch,
      port: this.port,
      marketplace,
    });

    // Setup event handlers
    this.mcpHub.on('configChangeDetected', (data: any) => {
      this.broadcastSubscriptionEvent(SubscriptionTypes.CONFIG_CHANGED, data);
    });

    // Setup event handlers
    this.mcpHub.on('importantConfigChanged', (changes: any) => {
      this.broadcastSubscriptionEvent(SubscriptionTypes.SERVERS_UPDATING, {
        changes,
      });
    });
    this.mcpHub.on('importantConfigChangeHandled', (changes: any) => {
      this.broadcastSubscriptionEvent(SubscriptionTypes.SERVERS_UPDATED, {
        changes,
      });
    });

    // Server-specific events
    this.mcpHub.on('toolsChanged', (data: any) => {
      this.broadcastSubscriptionEvent(
        SubscriptionTypes.TOOL_LIST_CHANGED,
        data,
      );
    });

    this.mcpHub.on('resourcesChanged', (data: any) => {
      this.broadcastSubscriptionEvent(
        SubscriptionTypes.RESOURCE_LIST_CHANGED,
        data,
      );
    });

    this.mcpHub.on('promptsChanged', (data: any) => {
      this.broadcastSubscriptionEvent(
        SubscriptionTypes.PROMPT_LIST_CHANGED,
        data,
      );
    });

    // Dev mode event handlers
    this.mcpHub.on('devServerRestarting', (data: any) => {
      this.broadcastSubscriptionEvent(SubscriptionTypes.SERVERS_UPDATING, data);
    });
    this.mcpHub.on('devServerRestarted', (data: any) => {
      this.broadcastSubscriptionEvent(SubscriptionTypes.SERVERS_UPDATED, data);
    });

    // Initialize MCP server endpoint
    try {
      mcpServerEndpoint = new MCPServerEndpoint(this.mcpHub);
      logger.info(
        `Hub endpoint ready: Use \`${mcpServerEndpoint.getEndpointUrl()}\` endpoint with any other MCP clients`,
      );
    } catch (error: any) {
      logger.error(
        'MCP_ENDPOINT_INIT_ERROR',
        'Failed to initialize MCP server endpoint',
        {
          error: error.message,
        },
        false,
      );
    }

    await this.mcpHub.initialize();
    this.setState(HubState.READY);
  }

  async restartHub(): Promise<void> {
    if (this.mcpHub) {
      this.setState(HubState.RESTARTING);
      logger.info('Restarting MCP Hub');
      await this.mcpHub.initialize(true);
      logger.info('MCP Hub restarted successfully');
      this.setState(HubState.RESTARTED, { has_restarted: true });
    }
  }

  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Starting HTTP server on port ${this.port}`, {
        port: this.port,
      });

      //INFO: this doesn't throw EADDRINUSE in express@v5 but is thrown inside on("error")
      this.server = app.listen(this.port, () => {
        logger.info('HTTP_SERVER_STARTED');
        resolve();
      });

      this.server.on('error', (error: any) => {
        this.setState(HubState.ERROR, {
          message: error.message,
          code: error.code,
        });
        logger.info(`HTTP_SERVER_START_ERROR: ${error.code}: ${error.message}`);
        reject(
          wrapError(error, 'HTTP_SERVER_ERROR', {
            port: this.port,
          }),
        );
      });
    });
  }

  async stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        logger.warn(
          'HTTP server is already stopped and cannot be stopped again',
        );
        resolve();
        return;
      }

      logger.info('Stopping HTTP server and closing all connections');
      this.server.close((error: any) => {
        if (error) {
          logger.error(
            'SERVER_STOP_ERROR',
            'Failed to stop HTTP server',
            {
              error: error.message,
              stack: error.stack,
            },
            false,
          );
          reject(wrapError(error, 'SERVER_STOP_ERROR'));
          return;
        }

        logger.info('HTTP server has been successfully stopped');
        this.server = null;
        resolve();
      });
    });
  }

  async stopMCPHub(): Promise<void> {
    if (!this.mcpHub) {
      logger.warn('MCP Hub is already stopped and cannot be stopped again');
      return;
    }

    logger.info('Stopping MCP Hub and cleaning up resources');
    try {
      await this.mcpHub.cleanup();
      logger.info('MCP Hub has been successfully stopped and cleaned up');
      this.mcpHub = null;
    } catch (error: any) {
      logger.error(
        'HUB_STOP_ERROR',
        'Failed to stop MCP Hub',
        {
          error: error.message,
          stack: error.stack,
        },
        false,
      );
    }
  }

  setupSignalHandlers(): void {
    const shutdown = (signal: string) => async () => {
      logger.info(`Received ${signal} signal - initiating graceful shutdown`, {
        signal,
      });
      try {
        await this.shutdown();
        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      } catch (error: any) {
        logger.error(
          'SHUTDOWN_ERROR',
          'Shutdown failed',
          {
            error: error.message,
            stack: error.stack,
          },
          true,
          1,
        );
      }
    };

    process.on('SIGTERM', shutdown('SIGTERM'));
    process.on('SIGINT', shutdown('SIGINT'));
  }

  async shutdown(): Promise<void> {
    this.setState(HubState.STOPPING);
    logger.info('Starting graceful shutdown process');

    // Close MCP server endpoint
    if (mcpServerEndpoint) {
      try {
        await mcpServerEndpoint.close();
        mcpServerEndpoint = null;
      } catch (error: any) {
        logger.debug(`Error closing MCP server endpoint: ${error.message}`);
      }
    }

    //INFO:Sometimes this might take some time, keeping the process alive, this might cause issue when restarting
    //INFO: MUST catch the error here to avoid unhandled rejection, which will again call shutdown() leading to infinite loop
    this.stopServer().catch((error: any) => {
      // Mostly happens when the server is already stopped (race condition)
      logger.debug(`Error stopping HTTP server: ${error.message}`);
    });
    await Promise.allSettled([
      this.stopMCPHub(),
      this.sseManager.shutdown(),
      this.workspaceCache.shutdown(),
    ]);
    this.setState(HubState.STOPPED);
  }
}

// Register SSE endpoint
registerRoute(
  'GET',
  '/events',
  'Subscribe to server events',
  async (req: Request, res: Response) => {
    try {
      if (!serviceManager?.sseManager) {
        throw new ServerError('SSE manager not initialized');
      }
      // Add client connection
      const connection = await serviceManager.sseManager.addConnection(
        req,
        res,
      );
      // Send initial state
      connection.send(EventTypes.HUB_STATE, serviceManager.getState());
    } catch (error: any) {
      logger.error('SSE_SETUP_ERROR', 'Failed to setup SSE connection', {
        error: error.message,
        stack: error.stack,
      });

      // Ensure response is ended
      if (!res.writableEnded) {
        res.status(500).end();
      }
    }
  },
);

// Register MCP SSE endpoint
app.get('/sse', async (req: Request, res: Response) => {
  try {
    if (!mcpServerEndpoint) {
      throw new ServerError('MCP server endpoint not initialized');
    }
    await mcpServerEndpoint.handleSSEConnection(req, res);
  } catch (error: any) {
    logger.warn(`Failed to setup MCP SSE connection: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).send('Error establishing MCP connection');
    }
  }
});

// Register MCP messages endpoint
app.post('/messages', async (req: Request, res: Response) => {
  try {
    if (!mcpServerEndpoint) {
      throw new ServerError('MCP server endpoint not initialized');
    }
    await mcpServerEndpoint.handleMCPMessage(req, res);
  } catch (error: any) {
    logger.warn('Failed to handle MCP message');
    if (!res.headersSent) {
      res.status(500).send('Error handling MCP message');
    }
  }
});

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    if (!mcpServerEndpoint) {
      throw new ServerError('MCP server endpoint not initialized');
    }
    await mcpServerEndpoint.handleStreamableHttpRequest(req, res);
  } catch (error: any) {
    logger.warn(
      `Failed to handle MCP streamable HTTP POST request: ${error.message}`,
    );
    if (!res.headersSent) {
      res.status(500).send('Error handling MCP request');
    }
  }
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: Request, res: Response) => {
  try {
    if (!mcpServerEndpoint) {
      throw new ServerError('MCP server endpoint not initialized');
    }
    await mcpServerEndpoint.handleStreamableHttpRequest(req, res);
  } catch (error: any) {
    logger.warn(
      `Failed to handle MCP streamable HTTP ${req.method} request: ${error.message}`,
    );
    if (!res.headersSent) {
      res.status(500).send('Error handling MCP request');
    }
  }
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Register marketplace endpoints
registerRoute(
  'GET',
  '/marketplace',
  'Get marketplace catalog with filtering and sorting',
  async (req: Request, res: Response) => {
    const { search, category, tags, sort } = req.query;
    try {
      const servers = await marketplace.getCatalog({
        search,
        category,
        tags: tags ? (tags as string).split(',') : undefined,
        sort,
      });
      res.json({
        servers,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'MARKETPLACE_ERROR', {
        query: req.query,
      });
    }
  },
);

registerRoute(
  'POST',
  '/marketplace/details',
  'Get detailed server information',
  async (req: Request, res: Response) => {
    const { mcpId } = req.body;
    try {
      if (!mcpId) {
        throw new ValidationError('Missing mcpId in request body');
      }

      const details = await marketplace.getServerDetails(mcpId);
      if (!details) {
        throw new ValidationError('Server not found', { mcpId });
      }

      res.json({
        server: details,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'MARKETPLACE_ERROR', {
        mcpId: req.body.mcpId,
      });
    }
  },
);

// Register workspaces endpoint
registerRoute(
  'GET',
  '/workspaces',
  'Get all active workspaces',
  async (req: Request, res: Response) => {
    try {
      const workspaces =
        await serviceManager!.workspaceCache.getActiveWorkspaces();
      res.json({
        workspaces,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'WORKSPACE_ERROR', {
        operation: 'list_workspaces',
      });
    }
  },
);

// Register server start endpoint
registerRoute(
  'POST',
  '/servers/start',
  'Start a server',
  async (req: Request, res: Response) => {
    const { server_name } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      const status = await serviceManager!.mcpHub!.startServer(server_name);
      res.json({
        status: 'ok',
        server: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'SERVER_START_ERROR', { server: server_name });
    } finally {
      serviceManager!.broadcastSubscriptionEvent(
        SubscriptionTypes.SERVERS_UPDATED,
        {
          changes: {
            modified: [server_name],
          },
        },
      );
    }
  },
);

// Register server stop endpoint
registerRoute(
  'POST',
  '/servers/stop',
  'Stop a server',
  async (req: Request, res: Response) => {
    const { server_name } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      const { disable } = req.query;
      const status = await serviceManager!.mcpHub!.stopServer(
        server_name,
        disable === 'true',
      );
      res.json({
        status: 'ok',
        server: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'SERVER_STOP_ERROR', { server: server_name });
    } finally {
      serviceManager!.broadcastSubscriptionEvent(
        SubscriptionTypes.SERVERS_UPDATED,
        {
          changes: {
            modified: [server_name],
          },
        },
      );
    }
  },
);

// Register health check endpoint
registerRoute(
  'GET',
  '/health',
  'Check server health',
  async (req: Request, res: Response) => {
    const healthData: HealthData = {
      status: 'ok',
      state: serviceManager?.state || HubState.STARTING,
      server_id: SERVER_ID,
      version: process.env.VERSION,
      activeClients: serviceManager?.sseManager?.connections.size || 0,
      timestamp: new Date().toISOString(),
      servers: serviceManager?.mcpHub?.getAllServerStatuses() || [],
      connections: serviceManager?.sseManager?.getStats() || {
        totalConnections: 0,
        connections: [],
      },
    };

    // Add MCP endpoint stats if available
    if (mcpServerEndpoint) {
      healthData.mcpEndpoint = mcpServerEndpoint.getStats();
    }

    // Add workspace information if available
    if (serviceManager?.workspaceCache) {
      try {
        healthData.workspaces = {
          current: serviceManager.workspaceCache.getWorkspaceKey(),
          allActive: await serviceManager.workspaceCache.getActiveWorkspaces(),
        };
      } catch (error: any) {
        logger.debug(
          `Failed to get workspace info for health check: ${error.message}`,
        );
      }
    }

    res.json(healthData);
  },
);

// Register server list endpoint
registerRoute(
  'GET',
  '/servers',
  'List all MCP servers and their status',
  (req: Request, res: Response) => {
    const servers = serviceManager!.mcpHub!.getAllServerStatuses();
    res.json({
      servers,
      timestamp: new Date().toISOString(),
    });
  },
);

// Register server info endpoint
registerRoute(
  'POST',
  '/servers/info',
  'Get status of a specific server',
  (req: Request, res: Response) => {
    const { server_name } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      const status = serviceManager!.mcpHub!.getServerStatus(server_name);
      res.json({
        server: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'SERVER_NOT_FOUND', {
        server: server_name,
      });
    }
  },
);

// Reloads the config file, disconnects all existing servers, and reconnects servers from the new config
registerRoute(
  'POST',
  '/restart',
  'Restart MCP Hub',
  async (req: Request, res: Response) => {
    try {
      await serviceManager!.restartHub();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'HUB_RESTART_ERROR');
    }
  },
);

// Sends a hard-restarting signal to all the clients. ON receiving clients should kill the process and start it again
// This is needed in order to load the latest process.env
// For usual restarts use the /restart endpoint
registerRoute(
  'POST',
  '/hard-restart',
  'Hard Restart MCP Hub',
  async (req: Request, res: Response) => {
    try {
      if (serviceManager!.mcpHub) {
        serviceManager!.setState(HubState.RESTARTING);
        process.emit('SIGTERM');
      }
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'HUB_HARD_RESTART_ERROR');
    }
  },
);

// Register server refresh endpoint
registerRoute(
  'POST',
  '/servers/refresh',
  "Refresh a server's capabilities",
  async (req: Request, res: Response) => {
    const { server_name } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      const info = await serviceManager!.mcpHub!.refreshServer(server_name);
      res.json({
        status: 'ok',
        server: info,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'SERVER_REFRESH_ERROR', { server: server_name });
    }
  },
);

// Register all servers refresh endpoint
registerRoute(
  'GET',
  '/refresh',
  "Refresh all servers' capabilities",
  async (req: Request, res: Response) => {
    try {
      const results = await serviceManager!.mcpHub!.refreshAllServers();
      res.json({
        status: 'ok',
        servers: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'SERVERS_REFRESH_ERROR');
    }
  },
);

//Register prompt endpoint
registerRoute(
  'POST',
  '/servers/prompts',
  'Get a prompt from a specific server',
  async (req: Request, res: Response) => {
    const { server_name, prompt, arguments: args, request_options } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      if (!prompt) {
        throw new ValidationError('Missing prompt name', { field: 'prompt' });
      }
      const result = await serviceManager!.mcpHub!.getPrompt(
        server_name,
        prompt,
        args || {},
        request_options,
      );
      res.json({
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, error.code || 'PROMPT_EXECUTION_ERROR', {
        server: server_name,
        prompt,
        ...(error.data || {}),
      });
    }
  },
);

// Register tool execution endpoint
registerRoute(
  'POST',
  '/servers/tools',
  'Execute a tool on a specific server',
  async (req: Request, res: Response) => {
    const { server_name, tool, arguments: args, request_options } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      if (!tool) {
        throw new ValidationError('Missing tool name', { field: 'tool' });
      }
      const result = await serviceManager!.mcpHub!.callTool(
        server_name,
        tool,
        args || {},
        request_options,
      );
      res.json({
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, error.code || 'TOOL_EXECUTION_ERROR', {
        server: server_name,
        tool,
        ...(error.data || {}),
      });
    }
  },
);

// Register resource access endpoint
registerRoute(
  'POST',
  '/servers/resources',
  'Access a resource on a specific server',
  async (req: Request, res: Response) => {
    const { server_name, uri, request_options } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }

      if (!uri) {
        throw new ValidationError('Missing resource URI', { field: 'uri' });
      }
      const result = await serviceManager!.mcpHub!.readResource(
        server_name,
        uri,
        request_options,
      );
      res.json({
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, error.code || 'RESOURCE_READ_ERROR', {
        server: server_name,
        uri,
        ...(error.data || {}),
      });
    }
  },
);

registerRoute(
  'POST',
  '/servers/authorize',
  'Handles opening different kinds of uris',
  async (req: Request, res: Response) => {
    const { server_name } = req.body;
    try {
      if (!server_name) {
        throw new ValidationError('Missing server name', {
          field: 'server_name',
        });
      }
      const connection = serviceManager!.mcpHub!.getConnection(server_name);
      const result = await connection.authorize();
      res.json(result);
    } catch (error: any) {
      throw wrapError(error, 'OPEN_REQUEST_ERROR', error.data || {});
    }
  },
);

//For cases where mcp-hub is running on a remote system and the oauth callback points to localhost
registerRoute(
  'POST',
  '/oauth/manual_callback',
  'Handle OAuth callback for manual authorization',
  async (req: Request, res: Response) => {
    let code: string | null, server_name: string | null;
    try {
      const { url } = req.body || {};
      if (!url) {
        throw new ValidationError('Missing URL parameter', { field: 'url' });
      }
      const url_with_code = new URL(url);
      if (url_with_code.searchParams.has('code')) {
        code = url_with_code.searchParams.get('code');
      }
      if (url_with_code.searchParams.has('server_name')) {
        server_name = url_with_code.searchParams.get('server_name');
      }
      if (!code || !server_name) {
        throw new ValidationError('Missing code or server_name parameter');
      }
      //simulate delay
      // await new Promise(resolve => setTimeout(resolve, 3000));
      const connection = serviceManager!.mcpHub!.getConnection(server_name);
      await connection.handleAuthCallback(code);
      // // Still broadcast the update for consistency
      serviceManager!.broadcastSubscriptionEvent(
        SubscriptionTypes.SERVERS_UPDATED,
        {
          changes: {
            modified: [server_name],
          },
        },
      );
      return res.json({
        status: 'ok',
        message: `Authorization successful for server '${server_name}'`,
        server_name,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      throw wrapError(error, 'MANUAL_OAUTH_CALLBACK_ERROR', {
        url: req.body?.url || null,
      });
    }
  },
);

registerRoute(
  'GET',
  '/oauth/callback',
  'Handle OAuth callback',
  async (req: Request, res: Response) => {
    const { code, server_name } = req.query;

    try {
      if (!code || !server_name) {
        throw new ValidationError('Missing code or server_name parameter');
      }
      // Send initial processing page
      res.write(`
        <html>
          <head>
            <title>MCP HUB</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
              .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .hidden { display: none; }
              .message { margin: 20px 0; font-size: 18px; }
            </style>
            <script>
              function updateStatus(status, message) {
                document.getElementById('processing').style.display = status === 'processing' ? 'block' : 'none';
                document.getElementById('success').style.display = status === 'success' ? 'block' : 'none';
                document.getElementById('error').style.display = status === 'error' ? 'block' : 'none';
                if (message) {
                  document.getElementById('errorMessage').textContent = message;
                }
              }
            </script>
          </head>
          <body>
            <div id="processing">
              <h1>MCP HUB</h1>
              <h2><code>${server_name}<code> Authorization Processing</h2>
              <div class="loader"></div>
              <p class="message">Please wait while mcp-hub completes the authorization...</p>
            </div>
            <div id="success" class="hidden">
              <h1>MCP HUB</h1>
              <h2><code>${server_name}<code> Authorization Successful</h2>
              <p class="message">Your server has been authorized successfully!</p>
              <p>You can close this window and return to the application.</p>
            </div>
            <div id="error" class="hidden">
              <h1>MCP HUB</h1>
              <h2><code>${server_name}<code> Authorization Failed</h2>
              <p class="message">An error occurred during authorization:</p>
              <p id="errorMessage" style="color: red;"></p>
              <p class="message">For errors like 'fetch failed' (serverless hosting might take time to startup), stopping and starting the MCP Server should help. </p>
            </div>
          </body>
        </html>
      `);

      const connection = serviceManager!.mcpHub!.getConnection(
        server_name as string,
      );

      await connection.handleAuthCallback(code as string);
      res.write('<script>updateStatus("success");</script>');
    } catch (error: any) {
      logger.error(
        'OAUTH_CALLBACK_ERROR',
        `Error during OAuth callback: ${error.message}`,
        {},
        false,
      );
      res.write(
        `<script>updateStatus("error", "${error.message.replace(/"/g, '\\"')}");</script>`,
      );
    } finally {
      // Still broadcast the update for consistency
      serviceManager!.broadcastSubscriptionEvent(
        SubscriptionTypes.SERVERS_UPDATED,
        {
          changes: {
            modified: [server_name as string],
          },
        },
      );
      res.end();
    }
  },
);

// Error handler middleware
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Determine if it's our custom error or needs wrapping
  const error = isMCPHubError(err)
    ? err
    : wrapError(err, 'REQUEST_ERROR', {
        path: req.path,
        method: req.method,
      });

  // Only send error response if headers haven't been sent
  if (!res.headersSent) {
    res.status(getStatusCode(error)).json({
      error: error.message,
      code: error.code,
      data: error.data,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start the server with options
export async function startServer(options: ServerConfig = {}): Promise<void> {
  serviceManager = new ServiceManager(options);

  try {
    serviceManager.setupSignalHandlers();

    // Start HTTP server first to fail fast on port conflicts
    await serviceManager.startServer();

    // Then initialize MCP Hub
    await serviceManager.initializeMCPHub();
  } catch (error: any) {
    const wrappedError = wrapError(error, error.code || 'SERVER_START_ERROR');
    try {
      serviceManager.setState(HubState.ERROR, {
        message: wrappedError.message,
        code: wrappedError.code,
        data: wrappedError.data,
      });
      await serviceManager.shutdown();
    } catch (e) {
    } finally {
      logger.error(
        wrappedError.code,
        wrappedError.message,
        wrappedError.data,
        true,
        1,
      );
    }
  }
}

export default app;
