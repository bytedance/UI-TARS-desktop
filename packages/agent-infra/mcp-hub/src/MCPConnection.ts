/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/MCPConnection.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import ReconnectingEventSource from 'reconnecting-eventsource';
import MCPHubOAuthProvider from './utils/oauth-provider.js';
import {
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  GetPromptResultSchema,
  CallToolResultSchema,
  ReadResourceResultSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ListPromptsResultSchema,
  Tool,
  Resource,
  ResourceTemplate,
  Prompt,
  LoggingLevel,
  RequestOptions,
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import EventEmitter from 'events';
import logger from './utils/logger.js';
import open from 'open';
import {
  ConnectionError,
  ToolError,
  ServerError,
  ResourceError,
  wrapError,
} from './utils/errors.js';
import { DevWatcher } from './utils/dev-watcher.js';
import { envResolver } from './utils/env-resolver.js';

// Connection status enum
export const ConnectionStatus = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  UNAUTHORIZED: 'unauthorized', // New status for OAuth flow
  DISABLED: 'disabled',
} as const;

export type ConnectionStatusType =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

// When a server is being installed for the first time, it might take some time to install the dependencies
const CLIENT_CONNECT_TIMEOUT = 5 * 60000; // 5 minutes

// Interface for server configuration
export interface ServerConfig {
  type: TransportType;
  disabled?: boolean;
  description?: string;
  name?: string;
  config_source?: string;
  dev?: DevConfig;
  // Stdio-specific properties
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // HTTP/SSE-specific properties
  url?: string;
  headers?: Record<string, string>;
}

// Interface for dev configuration
export interface DevConfig {
  enabled?: boolean;
  watch?: string[];
  cwd: string;
  debounce?: number;
}

// Transport types
export type TransportType = 'stdio' | 'sse' | 'http';

// Interface for marketplace item
export interface MarketplaceItem {
  mcpId: string;
  name?: string;
  description?: string;
}

// Interface for marketplace cache
export interface MarketplaceCache {
  catalog?: {
    items?: MarketplaceItem[];
  };
}

// Interface for marketplace
export interface Marketplace {
  cache?: MarketplaceCache;
}

// Interface for server info
export interface ServerInfo {
  name: string;
  displayName: string;
  description: string;
  transportType: TransportType;
  status: ConnectionStatusType;
  error: string | null;
  capabilities: {
    tools: Tool[];
    resources: Resource[];
    resourceTemplates: ResourceTemplate[];
    prompts: Prompt[];
  };
  uptime: number;
  lastStarted: string | null;
  authorizationUrl: string | null;
  serverInfo: { name: string; version: string } | null;
  config_source?: string;
}

// Interface for dev file change data
export interface DevFileChangeData {
  relativeFiles: string[];
  timestamp: string;
}

// Interface for authorization result
export interface AuthorizationResult {
  authorizationUrl: string;
}

// Interface for transport creation options
export interface TransportOptions {
  authProvider?: MCPHubOAuthProvider;
  requestInit?: {
    headers?: Record<string, string>;
  };
}

// Interface for notification handlers map
interface NotificationHandlersMap {
  tools: typeof ToolListChangedNotificationSchema;
  resources: typeof ResourceListChangedNotificationSchema;
  prompts: typeof PromptListChangedNotificationSchema;
}

// Interface for capability methods map
interface CapabilityMethodsMap {
  tools: {
    method: 'tools/list';
    schema: typeof ListToolsResultSchema;
  };
  resources: {
    method: 'resources/list';
    schema: typeof ListResourcesResultSchema;
  };
  resourceTemplates: {
    method: 'resources/templates/list';
    schema: typeof ListResourceTemplatesResultSchema;
  };
  prompts: {
    method: 'prompts/list';
    schema: typeof ListPromptsResultSchema;
  };
}

// Interface for logging notification params
interface LoggingNotificationParams {
  level?: LoggingLevel;
  data?: Record<string, any>;
}

// Interface for logging notification
interface LoggingNotification {
  params?: LoggingNotificationParams;
}

export class MCPConnection extends EventEmitter {
  public readonly name: string; // Keep as mcpId
  public displayName: string;
  public description: string;
  public config: ServerConfig;
  public client: Client | null;
  public transport:
    | StdioClientTransport
    | SSEClientTransport
    | StreamableHTTPClientTransport
    | null;
  public readonly transportType: TransportType;
  public tools: Tool[];
  public resources: Resource[];
  public prompts: Prompt[];
  public resourceTemplates: ResourceTemplate[];
  public status: ConnectionStatusType;
  public error: string | null;
  public startTime: number | null;
  public lastStarted: string | null;
  public disabled: boolean;
  public authorizationUrl: string | null;
  public readonly hubServerUrl: string;
  public serverInfo: { name: string; version: string } | null;

  // OAuth state
  private authProvider: MCPHubOAuthProvider | null;
  private authCallback: ((code: string) => void) | null;
  private authCode: string | null;

  // Dev watcher for file changes (stdio servers only)
  private devWatcher: DevWatcher | null;

  constructor(
    name: string,
    config: ServerConfig,
    marketplace?: Marketplace,
    hubServerUrl?: string,
  ) {
    super();
    this.name = name; // Keep as mcpId

    // OAuth state
    this.authProvider = null;
    this.authCallback = null;
    this.authCode = null;

    // Dev watcher for file changes (stdio servers only)
    this.devWatcher = null;

    // Set display name from marketplace
    this.displayName = name; // Default to mcpId
    let serverDescription = '';
    if (marketplace?.cache?.catalog?.items) {
      const item = marketplace.cache.catalog.items.find(
        (item) => item.mcpId === name,
      );
      if (item?.name) {
        this.displayName = item.name;
        serverDescription = item.description || '';
        logger.debug(`Using marketplace name for server '${name}'`, {
          name,
          displayName: item.name,
        });
      }
    }
    this.config = config;
    this.description = config.description
      ? config.description
      : serverDescription;
    this.client = null;
    this.transport = null;
    this.transportType = config.type; // Store the transport type from config
    this.tools = [];
    this.resources = [];
    this.prompts = [];
    this.resourceTemplates = [];
    this.status = config.disabled
      ? ConnectionStatus.DISABLED
      : ConnectionStatus.DISCONNECTED;
    this.error = null;
    this.startTime = null;
    this.lastStarted = null;
    this.disabled = config.disabled || false;
    this.authorizationUrl = null;
    this.hubServerUrl = hubServerUrl || '';
    this.serverInfo = null; // Will store server's reported name/version

    // Initialize dev watcher for stdio servers with dev config
    if (this.transportType === 'stdio' && config.dev) {
      this.devWatcher = new DevWatcher(this.name, config.dev);
      this.devWatcher.on('filesChanged', (data: DevFileChangeData) =>
        this.#handleDevFilesChanged(data),
      );
    }
  }

  async start(): Promise<ServerInfo> {
    // If disabled, enable it
    if (this.disabled) {
      this.disabled = false;
      this.config.disabled = false;
      this.status = ConnectionStatus.DISCONNECTED;
    }

    // If already connected, return current state
    if (this.status === ConnectionStatus.CONNECTED) {
      return this.getServerInfo();
    }

    await this.connect();
    return this.getServerInfo();
  }

  async stop(disable: boolean = false): Promise<ServerInfo> {
    if (disable) {
      this.disabled = true;
      this.config.disabled = true;
      this.status = ConnectionStatus.DISABLED;
    }

    await this.disconnect();
    return this.getServerInfo();
  }

  // Calculate uptime in seconds
  getUptime(): number {
    if (
      !this.startTime ||
      ![ConnectionStatus.CONNECTED, ConnectionStatus.DISABLED].includes(
        this.status,
      )
    ) {
      return 0;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  async connect(config?: ServerConfig): Promise<void> {
    try {
      if (config) {
        this.config = config;
      }
      if (this.config?.name) {
        this.displayName = this.config.name;
      }
      if (this.disabled) {
        this.status = ConnectionStatus.DISABLED;
        this.startTime = Date.now(); // Track uptime even when disabled
        this.lastStarted = new Date().toISOString();
        return;
      }

      this.error = null;
      this.status = ConnectionStatus.CONNECTING;
      this.lastStarted = new Date().toISOString();

      // Resolve config once for all transport types
      const resolvedConfig = await envResolver.resolveConfig(this.config, [
        'env',
        'args',
        'command',
        'url',
        'headers',
        'cwd',
      ]);

      try {
        // Create appropriate transport based on transport type
        if (this.transportType === 'stdio') {
          this.transport = await this._createStdioTransport(resolvedConfig);
          this.client = this._createClient();
          await this.client.connect(this.transport, {
            timeout: CLIENT_CONNECT_TIMEOUT,
          });
        } else {
          // First try the new http transport with fallback to deprecated sse transport
          try {
            this.authProvider = this._createOAuthProvider();
            this.transport = await this._createStreamableHTTPTransport(
              this.authProvider,
              resolvedConfig,
            );
            this.client = this._createClient();
            await this.client.connect(this.transport, {
              timeout: CLIENT_CONNECT_TIMEOUT,
            });
          } catch (httpError: any) {
            try {
              // catches 401 error from http transport
              if (this._isAuthError(httpError)) {
                logger.debug(
                  `'${this.name}' streamable-http transport needs authorization: ${httpError.message}`,
                );
                return this._handleUnauthorizedConnection();
              } else {
                logger.debug(
                  `'${this.name}' streamable-http error: ${httpError.message}. Falling back to SSE transport`,
                );
                this.authProvider = this._createOAuthProvider();
                this.transport = await this._createSSETransport(
                  this.authProvider,
                  resolvedConfig,
                );
                this.client = this._createClient();
                await this.client.connect(this.transport, {
                  timeout: CLIENT_CONNECT_TIMEOUT,
                });
              }
            } catch (sseError: any) {
              // catches 401 error from sse transport
              if (this._isAuthError(sseError)) {
                logger.debug(
                  `'${this.name}' SSE transport needs authorization: ${sseError.message}`,
                );
                return this._handleUnauthorizedConnection();
              } else {
                logger.debug(
                  `'${this.name}' failed to start connection with http and sse transports: ${sseError.message}`,
                );
                throw sseError;
              }
            }
          }
        }
      } catch (error: any) {
        logger.debug(
          `'${this.name}' failed to start connection: ${error.message}`,
        );
        throw error;
      }

      // Fetch server info and initial capabilities before marking as connected
      await this.fetchServerInfo();
      await this.updateCapabilities();

      // Set up notification handlers
      this.setupNotificationHandlers();

      // Only mark as connected after capabilities are fetched
      this.status = ConnectionStatus.CONNECTED;
      this.startTime = Date.now();
      this.error = null;

      // Start dev watcher if configured
      if (this.devWatcher) {
        await this.devWatcher.start(this.config.dev);
      }

      logger.info(`'${this.name}' MCP server connected`);
    } catch (error: any) {
      // Ensure proper cleanup on error
      await this.disconnect(error.message);
      throw new ConnectionError(
        `Failed to connect to "${this.name}" MCP server: ${error.message}`,
        {
          server: this.name,
          error: error.message,
        },
      );
    }
  }

  removeNotificationHandlers(): void {
    if (!this.client) return;
    // Remove all notification handlers
    // For some reason removeNotificationHandlers doesn't seem to work
    // so we are setting them to nothing
    const nothing = (): void => {};
    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      nothing,
    );
    this.client.setNotificationHandler(
      ResourceListChangedNotificationSchema,
      nothing,
    );
    this.client.setNotificationHandler(
      PromptListChangedNotificationSchema,
      nothing,
    );
    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      nothing,
    );
  }

  setupNotificationHandlers(): void {
    if (!this.client) return;

    // Handle general logging messages
    this.client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      (notification: LoggingNotification) => {
        const params = notification.params || {};
        const data = params.data || {};
        const level = params.level || 'debug';
        logger.debug(
          `["${this.name}" server ${level} log]: ${JSON.stringify(data, null, 2)}`,
        );
      },
    );

    const map: NotificationHandlersMap = {
      tools: ToolListChangedNotificationSchema,
      resources: ResourceListChangedNotificationSchema,
      prompts: PromptListChangedNotificationSchema,
    };

    // Handle tool list changes
    Object.keys(map).forEach((type) => {
      const typedType = type as keyof NotificationHandlersMap;
      this.client!.setNotificationHandler(map[typedType], async () => {
        logger.debug(`Received ${type}Changed notification`);
        await this.updateCapabilities(
          type === 'resources'
            ? ['resources', 'resourceTemplates']
            : [typedType],
        );
        const updatedData =
          type === 'resources'
            ? {
                resources: this.resources,
                resourceTemplates: this.resourceTemplates,
              }
            : {
                [type]: this[typedType],
              };
        this.emit(`${type}Changed`, {
          server: this.name,
          ...updatedData,
        });
      });
    });
  }

  async fetchServerInfo(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Get server info from the connected server
      this.serverInfo = this.client.getServerVersion();
    } catch (error: any) {
      logger.debug(
        `Could not fetch server info for '${this.name}': ${error.message}`,
      );
      this.serverInfo = null;
    }
  }

  async updateCapabilities(capabilitiesToUpdate?: string[]): Promise<void> {
    // skip for disabled servers
    if (!this.client) {
      return;
    }
    // Helper function to safely request capabilities
    const safeRequest = async (method: string, schema: any): Promise<any> => {
      try {
        const response = await this.client!.request({ method }, schema);
        return response;
      } catch (error: any) {
        // logger.debug( `Server '${this.name}' does not support capability '${method}'`);
        return null;
      }
    };

    const map: CapabilityMethodsMap = {
      tools: {
        method: 'tools/list',
        schema: ListToolsResultSchema,
      },
      resources: {
        method: 'resources/list',
        schema: ListResourcesResultSchema,
      },
      resourceTemplates: {
        method: 'resources/templates/list',
        schema: ListResourceTemplatesResultSchema,
      },
      prompts: {
        method: 'prompts/list',
        schema: ListPromptsResultSchema,
      },
    };

    try {
      const typesToFetch = capabilitiesToUpdate || Object.keys(map);
      const fetchPromises = typesToFetch.map(async (type) => {
        const typedType = type as keyof CapabilityMethodsMap;
        const result = await safeRequest(
          map[typedType].method,
          map[typedType].schema,
        );
        (this as any)[type] = result?.[type] || [];
      });
      await Promise.all(fetchPromises);
      //TODO: handle pagination
    } catch (error: any) {
      // Only log as warning since missing capabilities are expected in some cases
      logger.warn(`Error updating capabilities for server '${this.name}'`, {
        server: this.name,
        error: error.message,
      });
    }
  }

  async raw_request(...args: any[]): Promise<any> {
    if (!this.client) {
      throw new ToolError('Server not initialized', {
        server: this.name,
      });
    }
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ServerError('Server not connected', {
        server: this.name,
        status: this.status,
      });
    }

    try {
      return await this.client.request(...args);
    } catch (error: any) {
      throw wrapError(error, 'RAW_REQUEST_ERROR', {
        server: this.name,
      });
    }
  }

  async getPrompt(
    promptName: string,
    args?: Record<string, any> | any[],
    request_options?: RequestOptions,
  ): Promise<GetPromptResult> {
    if (!this.client) {
      throw new ToolError('Server not initialized', {
        server: this.name,
        prompt: promptName,
      });
    }
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ToolError('Server not connected', {
        server: this.name,
        prompt: promptName,
        status: this.status,
      });
    }

    const prompt = this.prompts.find((p) => p.name === promptName);
    if (!prompt) {
      throw new ToolError('Prompt not found', {
        server: this.name,
        prompt: promptName,
        availablePrompts: this.prompts.map((p) => p.name),
      });
    }
    // check args, it should be either a list or an object or null
    if (args && !Array.isArray(args) && typeof args !== 'object') {
      throw new ToolError('Invalid arguments', {
        server: this.name,
        prompt: promptName,
        args,
      });
    }

    try {
      return await this.client.request(
        {
          method: 'prompts/get',
          params: {
            name: promptName,
            arguments: args,
          },
        },
        GetPromptResultSchema,
        request_options,
      );
    } catch (error: any) {
      throw wrapError(error, 'PROMPT_EXECUTION_ERROR', {
        server: this.name,
        prompt: promptName,
        args,
      });
    }
  }

  /*
  * | Scenario            | Example Response                                                                 |
    |---------------------|----------------------------------------------------------------------------------|
    | Text Output         | `{ "content": [{ "type": "text", "text": "Hello, World!" }], "isError": false }` |
    | Image Output        | `{ "content": [{ "type": "image", "data": "base64data...", "mimeType": "image/png" }], "isError": false }` |
    | Text Resource       | `{ "content": [{ "type": "resource", "resource": { "uri": "file.txt", "text": "Content" } }], "isError": false }` |
    | Binary Resource     | `{ "content": [{ "type": "resource", "resource": { "uri": "image.jpg", "blob": "base64data...", "mimeType": "image/jpeg" } }], "isError": false }` |
    | Error Case          | `{ "content": [], "isError": true }` (Note: Error details might be in JSON-RPC level) |
    */
  async callTool(
    toolName: string,
    args?: Record<string, any> | any[],
    request_options?: RequestOptions,
  ): Promise<CallToolResult> {
    if (!this.client) {
      throw new ToolError('Server not initialized', {
        server: this.name,
        tool: toolName,
      });
    }

    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ToolError('Server not connected', {
        server: this.name,
        tool: toolName,
        status: this.status,
      });
    }

    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new ToolError('Tool not found', {
        server: this.name,
        tool: toolName,
        availableTools: this.tools.map((t) => t.name),
      });
    }

    // check args, it should be either a list or an object or null
    if (args && !Array.isArray(args) && typeof args !== 'object') {
      throw new ToolError('Invalid arguments', {
        server: this.name,
        tool: toolName,
        args,
      });
    }

    try {
      return await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        },
        CallToolResultSchema,
        request_options,
      );
    } catch (error: any) {
      throw wrapError(error, 'TOOL_EXECUTION_ERROR', {
        server: this.name,
        tool: toolName,
        args,
      });
    }
  }

  /*
  * | Scenario                     | Example Response                                                                 |
    |------------------------------|----------------------------------------------------------------------------------|
    | Text Resource                | `{ "contents": [{ "uri": "file.txt", "text": "This is the content of the file." }] }` |
    | Binary Resource without `mimeType` | `{ "contents": [{ "uri": "image.jpg", "blob": "base64encodeddata..." }] }`         |
    | Binary Resource with `mimeType` | `{ "contents": [{ "uri": "image.jpg", "mimeType": "image/jpeg", "blob": "base64encodeddata..." }] }` |
    | Multiple Resources           | `{ "contents": [{ "uri": "file1.txt", "text": "Content of file1" }, { "uri": "file2.png", "blob": "base64encodeddata..." }] }` |
    | No Resources (empty)         | `{ "contents": [] }`                                                             |
  */
  async readResource(
    uri: string,
    request_options?: RequestOptions,
  ): Promise<ReadResourceResult> {
    if (!this.client) {
      throw new ResourceError('Server not initialized', {
        server: this.name,
        uri,
      });
    }

    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new ResourceError('Server not connected', {
        server: this.name,
        uri,
        status: this.status,
      });
    }

    // const isValidResource =
    //   this.resources.some((r) => r.uri === uri) ||
    //   this.resourceTemplates.some((t) => {
    //     // Convert template to regex pattern
    //     const pattern = t.uriTemplate.replace(/\{[^}]+\}/g, "[^/]+");
    //     return new RegExp(`^${pattern}$`).test(uri);
    //   });

    // if (!isValidResource) {
    //   throw new ResourceError(`Resource not found : ${uri}`, {
    //     server: this.name,
    //     uri,
    //     availableResources: this.resources.map((r) => r.uri),
    //     availableTemplates: this.resourceTemplates.map((t) => t.uriTemplate),
    //   });
    // }

    try {
      return await this.client.request(
        {
          method: 'resources/read',
          params: { uri },
        },
        ReadResourceResultSchema,
        request_options,
      );
    } catch (error: any) {
      throw wrapError(error, 'RESOURCE_READ_ERROR', {
        server: this.name,
        uri,
      });
    }
  }

  async resetState(error?: string): Promise<void> {
    this.client = null;
    this.transport = null;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
    this.resourceTemplates = [];
    this.status = this.config.disabled
      ? ConnectionStatus.DISABLED
      : ConnectionStatus.DISCONNECTED;
    this.error = error || null;
    this.startTime = null;
    this.lastStarted = null;
    this.disabled = this.config.disabled || false;
    this.authorizationUrl = null;
    this.authProvider = null;
    this.serverInfo = null;
  }

  async disconnect(error?: string): Promise<void> {
    this.removeNotificationHandlers();

    // Stop dev watcher
    if (this.devWatcher) {
      await this.devWatcher.stop();
    }

    if (this.transport) {
      // First try to terminate the session gracefully
      if ((this.transport as any).sessionId) {
        try {
          logger.debug(`'${this.name}': Terminating session before exit...`);
          await (this.transport as any).terminateSession();
        } catch (error: any) {
          logger.debug(
            `'${this.name}': Error terminating session: ${error.message}`,
          );
        }
      }
      await this.transport.close();
    }
    await this.resetState(error);
  }

  // Create OAuth provider with proper metadata and storage
  private _createOAuthProvider(): MCPHubOAuthProvider {
    return new MCPHubOAuthProvider({
      serverName: this.name,
      serverUrl: this.config.url!,
      hubServerUrl: this.hubServerUrl,
    });
  }

  async authorize(): Promise<AuthorizationResult> {
    if (!this.authorizationUrl) {
      throw new Error(
        `No authorization URL available for server '${this.name}'`,
      );
    }
    // validate
    new URL(this.authorizationUrl);
    // log it in cases where the user in a browserless environment
    logger.info(
      `Opening authorization URL for server '${this.name}': ${this.authorizationUrl.toString()}`,
    );
    // Open the authorization URL in the default browser
    await open(this.authorizationUrl.toString());
    // Once the user authorizes, handleAuthCallback is called.
    return {
      authorizationUrl: this.authorizationUrl,
    };
  }

  async reconnect(): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }
    await this.connect();
  }

  async handleAuthCallback(code: string): Promise<void> {
    logger.debug(`Handling OAuth callback for server '${this.name}'`);
    await (this.transport as any).finishAuth(code);
    logger.debug(
      `Successful code exchange for '${this.name}': Authorized, connecting with new tokens`,
    );
    await this.connect();
  }

  getServerInfo(): ServerInfo {
    return {
      name: this.name, // Original mcpId
      displayName: this.displayName, // Friendly name from marketplace
      description: this.description,
      transportType: this.transportType, // Include transport type in server info
      status: this.status,
      error: this.error,
      capabilities: {
        tools: this.tools,
        resources: this.resources,
        resourceTemplates: this.resourceTemplates,
        prompts: this.prompts,
      },
      uptime: this.getUptime(),
      lastStarted: this.lastStarted,
      authorizationUrl: this.authorizationUrl,
      serverInfo: this.serverInfo, // Include server's reported name/version
      config_source: this.config.config_source, // Include which config file this server came from
    };
  }

  private async _createStdioTransport(
    resolvedConfig: ServerConfig,
  ): Promise<StdioClientTransport> {
    // Build serverEnv with resolved values
    const serverEnv = {
      // INFO: getDefaultEnvironment is imp in order to start mcp servers properly
      ...getDefaultEnvironment(),
      ...resolvedConfig.env,
    };

    const transport = new StdioClientTransport({
      cwd: resolvedConfig.cwd,
      command: resolvedConfig.command!, // Now supports ${} placeholders too!
      args: resolvedConfig.args, // Supports both ${} and legacy $VAR
      env: serverEnv,
      stderr: 'pipe',
    });

    // listen to stderr for stdio servers
    const stderrStream = transport.stderr;
    if (stderrStream) {
      stderrStream.on('data', (data: Buffer) => {
        const errorOutput = data.toString().trim();
        logger.warn(`${this.name} stderr: ${errorOutput}`);
      });
    }
    return transport;
  }

  private async _createStreamableHTTPTransport(
    authProvider: MCPHubOAuthProvider,
    resolvedConfig: ServerConfig,
  ): Promise<StreamableHTTPClientTransport> {
    const options = {
      authProvider,
      requestInit: {
        headers: resolvedConfig.headers, // Already resolved with commands support
      },
      // reconnectionOptions?: StreamableHTTPReconnectionOptions
      // sessionId?: string;
    };
    const transport = new StreamableHTTPClientTransport(
      new URL(resolvedConfig.url!),
      options,
    );
    return transport;
  }

  private async _createSSETransport(
    authProvider: MCPHubOAuthProvider,
    resolvedConfig: ServerConfig,
  ): Promise<SSEClientTransport> {
    // SSE transport setup with reconnection support
    const reconnectingEventSourceOptions = {
      max_retry_time: 5000, // Maximum time between retries (5 seconds)
      // withCredentials: resolvedConfig.headers?.["Authorization"] ? true : false,
    };

    // HACK: sending reconnectingEventSourceOptions in the SSEClientTransport needs us to create custom fetch function with headers created from authProvider tokens. This way we can use ReconnectingEventSource with necessary options
    class ReconnectingES extends ReconnectingEventSource {
      constructor(url: string | URL, options?: any) {
        super(url, {
          ...(options || {}),
          ...reconnectingEventSourceOptions,
        });
      }
    }
    // Use ReconnectingEventSource for automatic reconnection
    (global as any).EventSource = ReconnectingES;
    const transport = new SSEClientTransport(new URL(resolvedConfig.url!), {
      requestInit: {
        headers: resolvedConfig.headers, // Already resolved with commands support
      },
      authProvider,
      // INFO:: giving eventSourceInit leading to infinite loop, not needed anymore with global ReconnectingES
      // eventSourceInit: reconnectingEventSourceOptions
    });
    return transport;
  }

  private _createClient(): Client {
    const client = new Client(
      {
        name: 'mcp-hub',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );
    client.onerror = (error: Error) => {
      // logger.error("CLIENT_ERROR", `${this.name}: client error: ${error.message}`, {}, false);
      // INFO: onerror is being called for even minor errors, so debug seems more appropriate
      logger.debug(`'${this.name}' error: ${error.message}`);
    };

    client.onclose = () => {
      logger.debug(`'${this.name}' transport closed`);
      // This is causing a bug where in the frontend the server is shown as disconnected when we try disconnect() which sets to disconnected and again connect() which sets to connecting. Having this here negated the connecting status.
      // this.status = [ConnectionStatus.DISCONNECTED, ConnectionStatus.DISABLED].includes(this.status) ? this.status : ConnectionStatus.DISCONNECTED;
      this.startTime = null;
      // Emit close event for handling reconnection if needed
      this.emit('connectionClosed', {
        server: this.name,
        type: this.transportType,
      });
    };
    return client;
  }

  private _isAuthError(error: any): boolean {
    return error.code === 401 || error instanceof UnauthorizedError;
  }

  private _handleUnauthorizedConnection(): void {
    logger.warn(`Server '${this.name}' requires authorization`);
    this.status = ConnectionStatus.UNAUTHORIZED;
    // our custom oauth provider stores auth url generated from redirecthandler rather than opening url  right away
    this.authorizationUrl = (this.authProvider as any)?.generatedAuthUrl;
    if (!this.authorizationUrl) {
      logger.warn(`No authorization URL available for server '${this.name}'`);
    }
  }

  async #handleDevFilesChanged(data: DevFileChangeData): Promise<void> {
    try {
      logger.debug(
        `Dev file changes detected, restarting server '${this.name}'`,
      );

      // Emit dev restart starting event
      this.emit('devServerRestarting', {
        changes: { modified: [this.name] },
        reason: 'dev_file_change',
        files: data.relativeFiles,
        timestamp: data.timestamp,
      });
      // Perform restart
      await this.restartForDev();
      // Emit dev restart completed event
      this.emit('devServerRestarted', {
        changes: { modified: [this.name] },
        reason: 'dev_file_change',
        files: data.relativeFiles,
        timestamp: new Date().toISOString(),
        newCapabilities: this.getServerInfo().capabilities,
      });
      logger.debug(`Dev restart completed for server '${this.name}'`);
    } catch (error: any) {
      logger.error(
        'DEV_RESTART_ERROR',
        `Failed to restart server '${this.name}' after file changes: ${error.message}`,
        {
          server: this.name,
          files: data.relativeFiles,
          error: error.message,
        },
        false,
      );
      // Still emit the completed event with error info
      this.emit('devServerRestarted', {
        changes: { modified: [this.name] },
        reason: 'dev_file_change',
        files: data.relativeFiles,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  async restartForDev(): Promise<void> {
    // Store current config and dev watcher before reset
    const currentConfig = this.config;
    const devWatcher = this.devWatcher; // Preserve dev watcher
    // Disconnect current connection (but keep dev watcher running)
    this.removeNotificationHandlers();
    if (this.transport) {
      await this.transport.close();
    }
    // Reset connection state using resetState
    await this.resetState();
    // Restore dev watcher and set connecting status
    this.devWatcher = devWatcher;
    this.status = ConnectionStatus.CONNECTING;
    // Reconnect with same config
    await this.connect(currentConfig);
  }
}
