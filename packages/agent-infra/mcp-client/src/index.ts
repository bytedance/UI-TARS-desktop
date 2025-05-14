/**
 * The following code is modified based on
 * https://github.com/CherryHQ/cherry-studio/blob/main/src/main/services/MCPService.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 Cherry Studio
 * https://github.com/CherryHQ/cherry-studio/blob/main/LICENSE
 */
import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  type StdioServerParameters,
  StdioClientTransport,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  type Tool,
  CompatibilityCallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type {
  BuiltInMCPServer,
  MCPServer,
  StdioMCPServer,
} from '@agent-infra/mcp-shared/client';
import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

export { type MCPServer };

export interface MCPTool extends Tool {
  id: string;
  serverName: string;
}

export class MCPClient<
  ServerNames extends string = string,
> extends EventEmitter {
  private activeServers: Map<
    ServerNames,
    {
      client: Client;
      server: MCPServer;
    }
  > = new Map();
  private clients: {
    [key in ServerNames]?: Client;
  } = {};
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private store: Map<string, any> = new Map();
  private isDebug: boolean;

  constructor(
    servers: MCPServer<ServerNames>[],
    options?: { isDebug?: boolean },
  ) {
    super();
    this.isDebug = options?.isDebug || process.env.DEBUG === 'mcp' || false;
    this.store.set(
      'mcp.servers',
      servers.map((s) => ({
        ...s,
        status: s.status || 'activate',
      })),
    );
  }

  private log(level: 'info' | 'error' | 'warn' | 'debug', ...args: any[]) {
    if (!this.isDebug && level !== 'error') return;
    console[level](...args);
  }

  private getServersFromStore() {
    return (this.store.get('mcp.servers') || []) as MCPServer<ServerNames>[];
  }

  async init() {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.log('info', '[MCP] Starting initialization');

        this.initialized = true;

        await this.load(this.getServersFromStore());
        this.log('info', '[MCP] Initialization completed successfully');
      } catch (err) {
        this.initialized = false;
        this.log('error', '[MCP] Failed to initialize:', err);
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      this.log('debug', '[MCP] Ensuring initialization');
      await this.init();
    }
  }

  /**
   * Get enhanced PATH including common tool locations
   */
  private getEnhancedPath(originalPath: string): string {
    // split original PATH by separator
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    const existingPaths = new Set(
      originalPath.split(pathSeparator).filter(Boolean),
    );
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';

    // define new paths to add
    const newPaths: string[] = [];

    if (process.platform === 'darwin') {
      newPaths.push(
        '/bin',
        '/usr/bin',
        '/usr/local/bin',
        '/usr/local/sbin',
        '/opt/homebrew/bin',
        '/opt/homebrew/sbin',
        '/usr/local/opt/node/bin',
        `${homeDir}/.nvm/current/bin`,
        `${homeDir}/.npm-global/bin`,
        `${homeDir}/.yarn/bin`,
        `${homeDir}/.cargo/bin`,
        '/opt/local/bin',
      );
    }

    if (process.platform === 'linux') {
      newPaths.push(
        '/bin',
        '/usr/bin',
        '/usr/local/bin',
        `${homeDir}/.nvm/current/bin`,
        `${homeDir}/.npm-global/bin`,
        `${homeDir}/.yarn/bin`,
        `${homeDir}/.cargo/bin`,
        '/snap/bin',
      );
    }

    if (process.platform === 'win32') {
      newPaths.push(
        `${process.env.APPDATA}\\npm`,
        `${homeDir}\\AppData\\Local\\Yarn\\bin`,
        `${homeDir}\\.cargo\\bin`,
      );
    }

    // add new paths to existing paths
    newPaths.forEach((path) => {
      if (path && !existingPaths.has(path)) {
        existingPaths.add(path);
      }
    });

    // convert to string
    return Array.from(existingPaths).join(pathSeparator);
  }

  async activate(server: MCPServer<ServerNames>): Promise<void> {
    await this.ensureInitialized();
    try {
      const { name } = server;

      const client = new Client(
        {
          name: name,
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );
      let transport:
        | StdioClientTransport
        | SSEClientTransport
        | StreamableHTTPClientTransport
        | InMemoryTransport;

      if ('url' in server) {
        const { url, headers = {}, type } = server;
        if (type === 'streamable-http') {
          transport = new StreamableHTTPClientTransport(new URL(url), {
            requestInit: {
              headers,
            },
          } as StreamableHTTPClientTransportOptions);
        } else if (type === 'sse') {
          transport = new SSEClientTransport(new URL(url), {
            eventSourceInit: {
              fetch: (url, init) => fetch(url, { ...init, headers }),
            },
            requestInit: {
              headers,
            },
          });
        } else {
          throw new Error('Invalid server type');
        }

        await client.connect(transport);
      } else if ('command' in server) {
        const { command, args, env, cwd } =
          server as StdioMCPServer<ServerNames>;
        let cmd: string = command!;
        if (process.platform === 'win32') {
          if (command === 'npx') {
            cmd = `${command}.cmd`;
          } else if (command === 'node') {
            cmd = `${command}.exe`;
          }
        }

        const mergedEnv = {
          PATH: this.getEnhancedPath(process.env.PATH || ''),
          ...env,
        };

        const transportOpts: StdioServerParameters = {
          command: cmd,
          args,
          stderr: process.platform === 'win32' ? 'pipe' : 'inherit',
          env: mergedEnv as Record<string, string>,
          ...(cwd ? { cwd } : {}),
        };
        transport = new StdioClientTransport(transportOpts);

        await client.connect(transport);
      } else if ('mcpServer' in server) {
        const { mcpServer } = server;

        const [clientTransport, serverTransport] =
          InMemoryTransport.createLinkedPair();

        transport = clientTransport;

        await Promise.all([
          client.connect(clientTransport),
          mcpServer.connect(serverTransport),
        ]);

        this.log('info', `[MCP] Server ${name} started successfully`);
        this.emit('server-started', { name });
      } else {
        throw new Error('No command or url provided for server');
      }

      this.clients[name] = client;
      this.activeServers.set(name, { client, server });

      this.log('info', `[MCP] Server ${name} started successfully`);
      this.emit('server-started', { name });
    } catch (error) {
      this.log(
        'error',
        `[MCP] Error ${server?.name} activating server:`,
        error,
      );
      throw error;
    }
  }

  async load(servers: MCPServer<ServerNames>[]): Promise<void> {
    this.log('info', `[MCP] Loading ${servers.length} servers`);

    const activeServers = servers.filter(
      (server) => server.status === 'activate',
    );

    if (activeServers.length === 0) {
      this.log('info', '[MCP] No active servers to load');
      return;
    }

    for (const server of activeServers) {
      this.log('info', `[MCP] Activating server: ${server.name}`);
      try {
        await this.activate(server);
        this.log('info', `[MCP] Successfully activated server: ${server.name}`);
      } catch (error) {
        this.log(
          'error',
          `[MCP] Failed to activate server ${server.name}:`,
          error,
        );
        this.emit('server-error', { name: server.name, error });
      }
    }

    this.log(
      'info',
      `[MCP] Loaded and activated ${Object.keys(this.clients).length} servers`,
    );
  }

  public async listAvailableServices(): Promise<MCPServer<ServerNames>[]> {
    await this.ensureInitialized();
    return this.getServersFromStore();
  }

  public async addServer(server: MCPServer<ServerNames>): Promise<void> {
    await this.ensureInitialized();
    try {
      const servers = this.getServersFromStore();
      if (servers.some((s) => s.name === server.name)) {
        throw new Error(`Server with name ${server.name} already exists`);
      }

      servers.push(server);
      this.store.set('mcp.servers', servers);

      if (server.status === 'activate') {
        await this.activate(server);
      }
    } catch (error) {
      this.log('error', `Failed to add MCP server: ${error}`);
      throw error;
    }
  }

  public async getServer(
    name: ServerNames,
  ): Promise<MCPServer<ServerNames> | undefined> {
    await this.ensureInitialized();
    try {
      const servers = this.getServersFromStore();
      const server = servers.find((s) => s.name === name);

      if (!server) {
        throw new Error(`Server ${name} not found`);
      }

      return server;
    } catch (error) {
      this.log('error', '[MCP] Error deactivating server:', error);
      return undefined;
    }
  }

  public async deactivate(name: ServerNames): Promise<void> {
    await this.ensureInitialized();
    try {
      if (this.clients[name]) {
        this.log('info', `[MCP] Stopping server: ${name}`);
        await this.clients[name].close();
        delete this.clients[name];
        this.activeServers.delete(name);
        this.emit('server-stopped', { name });
      } else {
        this.log('warn', `[MCP] Server ${name} is not running`);
      }
    } catch (error) {
      this.log('error', '[MCP] Error deactivating server:', error);
      throw error;
    }
  }

  public async updateServer(server: MCPServer<ServerNames>): Promise<void> {
    await this.ensureInitialized();
    try {
      const servers = this.getServersFromStore();
      const index = servers.findIndex((s) => s.name === server.name);

      if (index === -1) {
        throw new Error(`Server ${server.name} not found`);
      }

      const wasActive = servers[index].status === 'activate';
      if (wasActive && !(server.status === 'activate')) {
        await this.deactivate(server.name as ServerNames);
      } else if (!wasActive && server.status === 'activate') {
        await this.activate(server);
      }

      servers[index] = server;
      this.store.set('mcp.servers', servers);
    } catch (error) {
      this.log('error', 'Failed to update MCP server:', error);
      throw error;
    }
  }

  public async deleteServer(serverName: ServerNames): Promise<void> {
    await this.ensureInitialized();
    try {
      if (this.clients[serverName]) {
        await this.deactivate(serverName);
      }

      const servers = this.getServersFromStore();
      const filteredServers = servers.filter((s) => s.name !== serverName);
      this.store.set('mcp.servers', filteredServers);
    } catch (error) {
      this.log('error', 'Failed to delete MCP server:', error);
      throw error;
    }
  }

  public async setServerActive(params: {
    name: ServerNames;
    isActive: boolean;
  }): Promise<void> {
    await this.ensureInitialized();
    try {
      const { name, isActive } = params;
      const servers = this.getServersFromStore();
      const server = servers.find((s) => s.name === name);

      if (!server) {
        throw new Error(`Server ${name} not found`);
      }

      server.status = isActive ? 'activate' : 'error';
      this.store.set('mcp.servers', servers);

      if (isActive) {
        await this.activate(server);
      } else {
        await this.deactivate(name);
      }
    } catch (error) {
      this.log('error', 'Failed to set MCP server active status:', error);
      throw error;
    }
  }

  public async checkServerStatus(
    server: MCPServer<ServerNames>,
  ): Promise<void> {
    await this.activate(server);
    await this.deactivate(server.name as ServerNames);
  }

  public async listTools(serverName?: ServerNames): Promise<MCPTool[]> {
    await this.ensureInitialized();
    try {
      if (serverName) {
        if (!this.clients[serverName]) {
          throw new Error(`MCP Client ${serverName} not found`);
        }
        const { tools } = await this.clients[serverName].listTools();
        return tools.map((tool: Tool) => {
          tool.serverName = serverName;
          tool.id = 'f' + uuidv4().replace(/-/g, '');
          tool.description = tool.description || `${serverName} - ${tool.name}`;
          return tool as MCPTool;
        });
      } else {
        let allTools: MCPTool[] = [];
        for (const clientName in this.clients) {
          try {
            this.log('info', `[MCP] Listing tools for ${clientName}`);

            const { tools } = await this.clients[clientName]!.listTools();

            this.log('info', `[MCP] Tools for ${clientName}:`, tools);
            allTools = allTools.concat(
              tools.map((tool: Tool) => {
                tool.serverName = clientName;
                tool.id = 'f' + uuidv4().replace(/-/g, '');
                tool.description =
                  tool.description || `${clientName} - ${tool.name}`;
                return tool as MCPTool;
              }),
            );
          } catch (error) {
            this.log(
              'error',
              `[MCP] Error listing tools for ${clientName}:`,
              error,
            );
          }
        }
        this.log('info', `[MCP] Total tools listed: ${allTools.length}`);
        return allTools;
      }
    } catch (error) {
      this.log('error', '[MCP] Error listing tools:', error);
      return [];
    }
  }

  public async callTool(params: {
    client: ServerNames;
    name: string;
    args: any;
  }): Promise<z.infer<typeof CompatibilityCallToolResultSchema>> {
    await this.ensureInitialized();
    try {
      const { client, name, args } = params;
      if (!this.clients[client]) {
        throw new Error(`MCP Client ${client} not found`);
      }
      const server = await this.getServer(client);

      this.log('info', '[MCP] Calling:', client, name, args);
      const result = await this.clients[client].callTool(
        {
          name,
          arguments: args,
        },
        undefined,
        {
          timeout: server?.timeout ? server?.timeout * 1000 : 10000, // default: 10s
        },
      );
      this.log('info', '[MCP] Call Tool Result:', result);
      return result;
    } catch (error) {
      this.log(
        'error',
        `[MCP] Error calling tool ${params.name} on ${params.client}:`,
        error,
      );
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      for (const name in this.clients) {
        await this.deactivate(name as ServerNames).catch((err) => {
          this.log('error', `[MCP] Error during cleanup of ${name}:`, err);
        });
      }
      this.clients = {};
      this.activeServers.clear();
      this.log('info', '[MCP] All servers cleaned up');
    } catch (error) {
      this.log('error', '[MCP] Failed to clean up servers:', error);
      throw error;
    }
  }
}
