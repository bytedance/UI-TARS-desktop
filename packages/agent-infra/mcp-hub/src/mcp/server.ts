/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/mcp/server.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 *
 * MCP Hub Server Endpoint - Unified MCP Server Interface
 *
 * This module creates a single MCP server endpoint that exposes ALL capabilities
 * from multiple managed MCP servers through one unified interface.
 *
 * HOW IT WORKS:
 * 1. MCP Hub manages multiple individual MCP servers (like filesystem, github, etc.)
 * 2. This endpoint collects all tools/resources/prompts from those servers
 * 3. It creates a single MCP server that any MCP client can connect to
 * 4. When a client calls a tool, it routes the request to the correct underlying server
 *
 * BENEFITS:
 * - Users manage all MCP servers in one place through MCP Hub's TUI
 * - MCP clients (like Claude Desktop, Cline, etc.) only need to connect to one endpoint
 * - No need to configure each MCP client with dozens of individual server connections
 * - Automatic capability updates when servers are added/removed/restarted
 *
 * EXAMPLE:
 * Just configure clients with with:
 * {
 *  "Hub": {
 *    "url": "http://localhost:${port}/sse"
 *  }
 * }
 * The hub exposes capabilities directly without namespacing:
 * - Tools from different servers may have the same name
 * - Last server to register a tool name will override previous ones
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  GetPromptResultSchema,
  CallToolResultSchema,
  ReadResourceResultSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { HubState } from '../utils/sse-manager.js';
import logger from '../utils/logger.js';
import type { Request, Response } from 'express';
import type { MCPHub } from '../MCPHub.js';
import type { MCPConnection } from '../MCPConnection.js';

// Unique server name to identify our internal MCP endpoint
const HUB_INTERNAL_SERVER_NAME = 'mcp-hub-internal-endpoint';

const MCP_REQUEST_TIMEOUT = 5 * 60 * 1000; //Default to 5 minutes

interface CapabilityRegistration {
  serverName: string;
  originalName: string;
  definition: any;
}

interface CapabilityTypeConfig {
  id: string;
  uidField: string;
  syncWithEvents?: {
    events: string[];
    capabilityIds: string[];
    notificationMethod: string;
  };
  listSchema?: any;
  handler?: {
    method: string;
    callSchema?: any;
    resultSchema?: any;
    form_error: (error: Error | unknown) => any;
    form_params: (cap: CapabilityRegistration, request: any) => any;
  };
}

interface ClientInfo {
  transport: any;
  server: Server;
}

// Comprehensive capability configuration
const CAPABILITY_TYPES: Record<string, CapabilityTypeConfig> = {
  TOOLS: {
    id: 'tools',
    uidField: 'name',
    syncWithEvents: {
      events: ['toolsChanged'],
      capabilityIds: ['tools'],
      notificationMethod: 'sendToolListChanged',
    },
    listSchema: ListToolsRequestSchema,
    handler: {
      method: 'tools/call',
      callSchema: CallToolRequestSchema,
      resultSchema: CallToolResultSchema,
      form_error(error: Error | unknown) {
        return {
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      },
      form_params(cap: CapabilityRegistration, request: any) {
        return {
          name: cap.originalName,
          arguments: request.params.arguments || {},
        };
      },
    },
  },
  RESOURCES: {
    id: 'resources',
    uidField: 'uri',
    syncWithEvents: {
      events: ['resourcesChanged'],
      capabilityIds: ['resources', 'resourceTemplates'],
      notificationMethod: 'sendResourceListChanged',
    },
    listSchema: ListResourcesRequestSchema,
    handler: {
      method: 'resources/read',
      form_error(error: Error | unknown) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
      form_params(cap: CapabilityRegistration, request: any) {
        return {
          uri: cap.originalName,
        };
      },
      callSchema: ReadResourceRequestSchema,
      resultSchema: ReadResourceResultSchema,
    },
  },
  RESOURCE_TEMPLATES: {
    id: 'resourceTemplates',
    uidField: 'uriTemplate',
    // No syncWithEvents - handled by resources event
    listSchema: ListResourceTemplatesRequestSchema,
    // No callSchema - templates are listed only
    syncWithEvents: {
      events: [],
      capabilityIds: [],
      notificationMethod: 'sendResourceListChanged',
    },
  },
  PROMPTS: {
    id: 'prompts',
    uidField: 'name',
    syncWithEvents: {
      events: ['promptsChanged'],
      capabilityIds: ['prompts'],
      notificationMethod: 'sendPromptListChanged',
    },
    listSchema: ListPromptsRequestSchema,
    handler: {
      method: 'prompts/get',
      callSchema: GetPromptRequestSchema,
      resultSchema: GetPromptResultSchema,
      form_params(cap: CapabilityRegistration, request: any) {
        return {
          name: cap.originalName,
          arguments: request.params.arguments || {},
        };
      },
      form_error(error: Error | unknown) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    },
  },
};

/**
 * MCP Server endpoint that exposes all managed server capabilities
 * This allows standard MCP clients to connect to mcp-hub via MCP protocol
 */
export class MCPServerEndpoint {
  private mcpHub: MCPHub;
  private clients: Map<string, ClientInfo>;
  private serversMap: Map<string, MCPConnection>;
  private streamableHttpTransports: Map<string, any>;
  private registeredCapabilities: Record<
    string,
    Map<string, CapabilityRegistration>
  >;

  constructor(mcpHub: MCPHub) {
    this.mcpHub = mcpHub;
    this.clients = new Map(); // sessionId -> { transport, server }
    this.serversMap = new Map(); // sessionId -> server instance
    this.streamableHttpTransports = new Map(); // sessionId -> StreamableHTTPServerTransport

    // Store registered capabilities by type
    this.registeredCapabilities = {};
    Object.values(CAPABILITY_TYPES).forEach((capType) => {
      this.registeredCapabilities[capType.id] = new Map(); // namespacedName -> { serverName, originalName, definition }
    });

    // Setup capability synchronization once
    this.setupCapabilitySync();

    // Initial capability registration
    this.syncCapabilities();
  }

  getEndpointUrl(): string {
    return `${this.mcpHub.hubServerUrl}/sse (SSE) or ${this.mcpHub.hubServerUrl}/mcp (Streamable HTTP)`;
  }

  /**
   * Create a new MCP server instance for each connection
   */
  createServer(): Server {
    // Create low-level MCP server instance with unique name
    const server = new Server(
      {
        name: HUB_INTERNAL_SERVER_NAME,
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
          resources: {
            listChanged: true,
          },
          prompts: {
            listChanged: true,
          },
        },
      },
    );
    server.onerror = function (err) {
      logger.warn(`Hub Endpoint onerror: ${err.message}`);
    };
    // Setup request handlers for this server instance
    this.setupRequestHandlers(server);

    return server;
  }

  /**
   * Creates a safe server name for namespacing (replace special chars with underscores)
   */
  createSafeServerName(serverName: string): string {
    return serverName.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Setup MCP request handlers for a server instance
   */
  setupRequestHandlers(server: Server): void {
    // Setup handlers for each capability type
    Object.values(CAPABILITY_TYPES).forEach((capType) => {
      const capId = capType.id;

      // Setup list handler if schema exists
      if (capType.listSchema) {
        server.setRequestHandler(capType.listSchema, () => {
          const capabilityMap = this.registeredCapabilities[capId];
          const capabilities = Array.from(capabilityMap.values()).map(
            (item) => item.definition,
          );
          return { [capId]: capabilities };
        });
      }

      // Setup call/action handler if schema exists
      if (capType.handler?.callSchema) {
        server.setRequestHandler(
          capType.handler.callSchema,
          async (request, extra) => {
            const registeredCap = this.getRegisteredCapability(
              request,
              capType.id,
              capType.uidField,
            );
            if (!registeredCap) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `${capId} capability not found: ${request.params[capType.uidField]}`,
              );
            }
            const { serverName, originalName } = registeredCap;
            const request_options = {
              timeout: MCP_REQUEST_TIMEOUT,
            };
            try {
              const result = await this.mcpHub.rawRequest(
                serverName,
                {
                  method: capType.handler!.method,
                  params: capType.handler!.form_params(registeredCap, request),
                },
                capType.handler!.resultSchema,
                request_options,
              );
              return result;
            } catch (error) {
              logger.debug(
                `Error executing ${capId} '${originalName}': ${error instanceof Error ? error.message : String(error)}`,
              );
              return capType.handler!.form_error(error);
            }
          },
        );
      }
    });
  }

  getRegisteredCapability(
    request: any,
    capId: string,
    uidField: string,
  ): CapabilityRegistration | undefined {
    const capabilityMap = this.registeredCapabilities[capId];
    let key = request.params[uidField];
    const registeredCap = capabilityMap.get(key);
    return registeredCap;
  }

  /**
   * Setup listeners for capability changes from managed servers
   */
  setupCapabilitySync(): void {
    // For each capability type with syncWithEvents
    Object.values(CAPABILITY_TYPES).forEach((capType) => {
      if (capType.syncWithEvents) {
        const { events, capabilityIds } = capType.syncWithEvents;

        events.forEach((event) => {
          this.mcpHub.on(event, (data) => {
            this.syncCapabilities(capabilityIds);
          });
        });
      }
    });

    // Global events that sync ALL capabilities
    const globalSyncEvents = ['importantConfigChangeHandled'];
    globalSyncEvents.forEach((event) => {
      this.mcpHub.on(event, (data) => {
        this.syncCapabilities(); // Sync all capabilities
      });
    });

    // Listen for hub state changes to re-sync all capabilities when servers are ready
    this.mcpHub.on('hubStateChanged', (data) => {
      const { state } = data;
      const criticalStates = [
        HubState.READY,
        HubState.RESTARTED,
        HubState.STOPPED,
        HubState.ERROR,
      ];

      if (criticalStates.includes(state)) {
        this.syncCapabilities(); // Sync all capabilities
      }
    });
  }

  /**
   * Synchronize capabilities from connected servers
   * @param capabilityIds - Specific capability IDs to sync, defaults to all
   */
  syncCapabilities(capabilityIds: string[] | null = null): void {
    // Default to all capability IDs if none specified
    const idsToSync =
      capabilityIds ||
      Object.values(CAPABILITY_TYPES).map((capType) => capType.id);

    // Update the servers map with current connection states
    this.syncServersMap();

    // Sync each requested capability type and notify clients of changes
    idsToSync.forEach((capabilityId) => {
      const changed = this.syncCapabilityType(capabilityId);
      if (changed) {
        // Send notification for this specific capability type if we have active connections
        if (this.hasActiveConnections()) {
          const capType = Object.values(CAPABILITY_TYPES).find(
            (cap) => cap.id === capabilityId,
          );
          if (capType?.syncWithEvents?.notificationMethod) {
            this.notifyCapabilityChanges(
              capType.syncWithEvents.notificationMethod,
            );
          }
        }
      }
    });
  }

  /**
   * Synchronize the servers map with current connection states
   * Creates safe server IDs for namespacing capabilities
   */
  syncServersMap(): void {
    this.serversMap.clear();

    // Register all connected servers with unique safe IDs
    for (const connection of this.mcpHub.connections.values()) {
      if (connection.status === 'connected' && !connection.disabled) {
        const name = connection.name;
        let id = this.createSafeServerName(name);

        // Ensure unique ID by appending counter if needed
        if (this.serversMap.has(id)) {
          let counter = 1;
          while (this.serversMap.has(`${id}_${counter}`)) {
            counter++;
          }
          id = `${id}_${counter}`;
        }
        this.serversMap.set(id, connection);
      }
    }
  }

  /**
   * Synchronize a specific capability type and detect changes
   */
  syncCapabilityType(capabilityId: string): boolean {
    const capabilityMap = this.registeredCapabilities[capabilityId];
    const previousKeys = new Set(capabilityMap.keys());

    // Clear and rebuild capabilities from connected servers
    capabilityMap.clear();
    for (const [serverId, connection] of this.serversMap) {
      if (connection.status === 'connected' && !connection.disabled) {
        this.registerServerCapabilities(connection, { capabilityId, serverId });
      }
    }

    // Check if capability keys changed
    const newKeys = new Set(capabilityMap.keys());
    return (
      previousKeys.size !== newKeys.size ||
      [...newKeys].some((key) => !previousKeys.has(key))
    );
  }

  /**
   * Send capability change notifications to all connected clients
   */
  notifyCapabilityChanges(notificationMethod: string): void {
    for (const { server } of this.clients.values()) {
      try {
        (server as any)[notificationMethod]();
      } catch (error) {
        logger.warn(
          `Error sending ${notificationMethod} notification: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Register capabilities from a server connection for a specific capability type
   * Creates namespaced capability names to avoid conflicts between servers
   */
  registerServerCapabilities(
    connection: MCPConnection,
    { capabilityId, serverId }: { capabilityId: string; serverId: string },
  ): void {
    const serverName = connection.name;

    // Skip self-reference to prevent infinite recursion
    if (this.isSelfReference(connection)) {
      return;
    }

    // Find the capability type configuration and get server's capabilities
    const capType = Object.values(CAPABILITY_TYPES).find(
      (cap) => cap.id === capabilityId,
    );
    const capabilities = (connection as any)[capabilityId];
    if (!capabilities || !Array.isArray(capabilities)) {
      return; // No capabilities of this type
    }

    const capabilityMap = this.registeredCapabilities[capabilityId];

    // Get prefix from connection config
    const prefix = (connection.config as any)?.prefix;

    // Register each capability with prefix if configured
    for (const cap of capabilities) {
      const originalValue = cap[capType!.uidField];

      // Apply prefix to capability name if configured
      let exposedName = originalValue;
      let capDefinition = cap;
      if (prefix && capabilityId === 'tools') {
        exposedName = `${prefix}_${originalValue}`;
        // Update the capability definition with the prefixed name
        capDefinition = { ...cap, [capType!.uidField]: exposedName };
      }

      // Store capability with metadata for routing back to original server
      // Note: If multiple servers have the same capability name, the last one to register will be used
      capabilityMap.set(exposedName, {
        serverName,
        originalName: originalValue,
        definition: capDefinition,
      });
    }
  }

  /**
   * Check if a connection is a self-reference (connecting to our own MCP endpoint)
   */
  isSelfReference(connection: MCPConnection): boolean {
    // Primary check: Compare server's reported name with our internal server name
    if (
      connection.serverInfo &&
      connection.serverInfo.name === HUB_INTERNAL_SERVER_NAME
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check if there are any active MCP client connections
   */
  hasActiveConnections(): boolean {
    return this.clients.size > 0;
  }

  /**
   * Handle SSE transport creation (GET /sse)
   */
  async handleSSEConnection(req: Request, res: Response): Promise<void> {
    // Create SSE transport
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;

    // Create a new server instance for this connection
    const server = this.createServer();

    // Store transport and server together
    this.clients.set(sessionId, { transport, server });

    let clientInfo: any;

    // Setup cleanup on close
    const cleanup = async () => {
      this.clients.delete(sessionId);
      try {
        await server.close();
      } catch (error) {
        logger.warn(
          `Error closing server connected to ${clientInfo?.name ?? 'Unknown'}: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        logger.info(
          `'${clientInfo?.name ?? 'Unknown'}' client disconnected from MCP HUB`,
        );
      }
    };

    res.on('close', cleanup);
    transport.onclose = cleanup;

    // Connect MCP server to transport
    await server.connect(transport);
    server.oninitialized = () => {
      clientInfo = server.getClientVersion();
      if (clientInfo) {
        logger.info(`'${clientInfo.name}' client connected to MCP HUB`);
      }
    };
  }

  /**
   * Handle MCP messages (POST /messages)
   */
  async handleMCPMessage(req: Request, res: Response): Promise<void> {
    const sessionId = req.query.sessionId as string;
    function sendErrorResponse(code: number, error: Error) {
      res.status(code).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: error.message || 'Invalid request',
        },
        id: null,
      });
    }

    if (!sessionId) {
      logger.warn('MCP message received without session ID');
      return sendErrorResponse(400, new Error('Missing sessionId parameter'));
    }

    const transportInfo = this.clients.get(sessionId);
    if (transportInfo) {
      await transportInfo.transport.handlePostMessage(req, res, req.body);
    } else {
      logger.warn(`MCP message for unknown session: ${sessionId}`);
      return sendErrorResponse(
        404,
        new Error(`Session not found: ${sessionId}`),
      );
    }
  }

  /**
   * Handle Streamable HTTP requests (POST/GET/DELETE /mcp)
   */
  async handleStreamableHttpRequest(
    req: Request,
    res: Response,
  ): Promise<void> {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string;
    let transport: any;

    if (sessionId && this.streamableHttpTransports.has(sessionId)) {
      // Reuse existing transport
      transport = this.streamableHttpTransports.get(sessionId);
    } else if (
      !sessionId &&
      req.method === 'POST' &&
      isInitializeRequest(req.body)
    ) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId: string) => {
          // Store the transport by session ID
          this.streamableHttpTransports.set(sessionId, transport);
        },
        // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
        // locally, make sure to set:
        // enableDnsRebindingProtection: true,
        // allowedHosts: ['127.0.0.1'],
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          this.streamableHttpTransports.delete(transport.sessionId);
        }
      };

      // Create a new server instance
      const server = this.createServer();

      // Connect to the MCP server
      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  }

  /**
   * Get statistics about the MCP endpoint
   */
  getStats(): {
    activeClients: number;
    registeredCapabilities: Record<string, number>;
    totalCapabilities: number;
  } {
    const capabilityCounts = Object.entries(this.registeredCapabilities).reduce(
      (acc: Record<string, number>, [type, map]) => {
        acc[type] = map.size;
        return acc;
      },
      {},
    );

    return {
      activeClients: this.clients.size,
      registeredCapabilities: capabilityCounts,
      totalCapabilities: Object.values(capabilityCounts).reduce(
        (sum: number, count: number) => sum + count,
        0,
      ),
    };
  }

  /**
   * Close all transports and cleanup
   */
  async close(): Promise<void> {
    // Close all servers (which will close their transports)
    for (const [sessionId, { server }] of this.clients) {
      try {
        await server.close();
      } catch (error) {
        logger.debug(
          `Error closing server ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.clients.clear();

    // Clear streamable HTTP transports
    this.streamableHttpTransports.clear();

    // Clear all registered capabilities
    Object.values(this.registeredCapabilities).forEach((map) => map.clear());

    logger.info('MCP server endpoint closed');
  }
}
