/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  ToolDefinition,
  JSONSchema7,
  MCPAgent,
  MCPServerRegistry,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
} from '@multimodal/agent';
import {
  InMemoryMCPModule,
  MCPServerInterface,
  AgentTARSOptions,
  BuiltInMCPServers,
  BuiltInMCPServerName,
} from './types';
import { DEFAULT_SYSTEM_PROMPT } from './shared';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * A Agent TARS that uses in-memory MCP tool call
 * for built-in MCP Servers.
 */
export class AgentTARS extends MCPAgent {
  private workingDirectory: string;
  private tarsOptions: AgentTARSOptions;
  private mcpServers: BuiltInMCPServers = {};
  private inMemoryMCPClients: Partial<Record<BuiltInMCPServerName, Client>> = {};

  // Message history storage for experimental dump feature
  private traces: Array<{
    type: 'request' | 'response';
    timestamp: number;
    id: string;
    data: any;
  }> = [];

  constructor(options: AgentTARSOptions) {
    // Prepare system instructions by combining default prompt with custom instructions
    const instructions = options.instructions
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${options.instructions}`
      : DEFAULT_SYSTEM_PROMPT;

    // Apply default config
    const tarsOptions: AgentTARSOptions = {
      search: {
        provider: 'browser_search',
        count: 10,
        browserSearch: {
          engine: 'google',
          needVisitedUrls: false,
          ...(options.search?.browserSearch || {}),
        },
        ...(options.search ?? {}),
      },
      browser: {
        type: 'local',
        headless: false,
        controlSolution: 'browser-use',
        ...(options.browser ?? {}),
      },
      mcpImpl: 'in-memory',
      mcpServers: {},
      maxTokens: 10000, // Set default maxTokens to 10000 for AgentTARS
      ...options,
    };

    const { workingDirectory = process.cwd() } = tarsOptions.workspace!;

    // Under the 'in-memory' implementation, the built-in mcp server will be implemented independently
    // Note that the usage of the attached mcp server will be the same as the implementation,
    // because we cannot determine whether it supports same-process calls.
    const mcpServers: MCPServerRegistry = {
      ...(options.mcpImpl === 'stdio'
        ? {
            search: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-search'],
            },
            browser: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-browser'],
            },
            filesystem: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-filesystem', workingDirectory],
            },
            commands: {
              command: 'npx',
              args: ['-y', '@agent-infra/mcp-server-commands'],
            },
          }
        : {}),
      ...(options.mcpServers || {}),
    };

    super({
      ...options,
      name: options.name ?? 'AgentTARS',
      instructions,
      mcpServers,
      maxTokens: tarsOptions.maxTokens, // Ensure maxTokens is passed to the parent class
    });

    this.logger = this.logger.spawn('AgentTARS');
    this.tarsOptions = tarsOptions;
    this.workingDirectory = workingDirectory;
    this.logger.info(`🤖 AgentTARS initialized | Working directory: ${workingDirectory}`);

    if (options.experimental?.dumpMessageHistory) {
      this.logger.info('📝 Message history dump enabled');
    }
  }

  /**
   * Initialize in-memory MCP modules and register tools
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing AgentTARS ...');

    await Promise.all([
      /**
       * Base mcp-agent's initialization process.
       */
      super.initialize(),
      /**
       * In-process MCP initialization.
       */
      this.tarsOptions.mcpImpl === 'in-memory'
        ? this.initializeInMemoryMCPForBuiltInMCPServers()
        : Promise.resolve(),
    ]);
  }

  /**
   * Initialize in-memory mcp for built-in mcp servers using the new architecture
   * with direct server creation and configuration
   */
  private async initializeInMemoryMCPForBuiltInMCPServers() {
    try {
      // Dynamically import the required MCP modules
      const [searchModule, browserModule, filesystemModule, commandsModule] = await Promise.all([
        this.dynamicImport('@agent-infra/mcp-server-search'),
        this.dynamicImport('@agent-infra/mcp-server-browser'),
        this.dynamicImport('@agent-infra/mcp-server-filesystem'),
        this.dynamicImport('@agent-infra/mcp-server-commands'),
      ]);

      // Create servers with appropriate configurations
      this.mcpServers = {
        search: searchModule.default.createServer({
          provider: this.tarsOptions.search!.provider,
          providerConfig: {
            count: this.tarsOptions.search!.count,
            engine: this.tarsOptions.search!.browserSearch?.engine,
            needVisitedUrls: this.tarsOptions.search!.browserSearch?.needVisitedUrls,
          },
          apiKey: this.tarsOptions.search!.apiKey,
          baseUrl: this.tarsOptions.search!.baseUrl,
        }),
        browser: browserModule.default.createServer({
          launchOptions: {
            headless: this.tarsOptions.browser?.headless,
          },
        }),
        filesystem: filesystemModule.default.createServer({
          allowedDirectories: [this.workingDirectory],
        }),
        commands: commandsModule.default.createServer(),
      };

      // Create in-memory clients for each server
      await Promise.all(
        Object.entries(this.mcpServers).map(async ([name, server]) => {
          const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

          // Create a client for this server
          const client = new Client(
            {
              name: `${name}-client`,
              version: '1.0',
            },
            {
              capabilities: {
                roots: {
                  listChanged: true,
                },
              },
            },
          );

          // Connect the client and server
          await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

          // Store the client for later use
          this.inMemoryMCPClients[name as BuiltInMCPServerName] = client;
          this.logger.info(`✅ Connected to ${name} MCP server`);
        }),
      );

      // Register tools from each client
      await Promise.all(
        Object.entries(this.inMemoryMCPClients).map(async ([name, client]) => {
          await this.registerToolsFromClient(name as BuiltInMCPServerName, client!);
        }),
      );

      this.logger.info('✅ AgentTARS initialization complete.');
    } catch (error) {
      this.logger.error('❌ Failed to initialize AgentTARS:', error);
      throw new Error(
        `Failed to initialize AgentTARS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register tools from a specific MCP client
   */
  private async registerToolsFromClient(
    moduleName: BuiltInMCPServerName,
    client: Client,
  ): Promise<void> {
    try {
      // Get tools from the client
      const tools = await client.listTools();

      if (!tools || !Array.isArray(tools.tools)) {
        this.logger.warn(`⚠️ No tools returned from '${moduleName}' module`);
        return;
      }

      // Register each tool with the agent
      for (const tool of tools.tools) {
        if (tool.name === 'browser_get_html') {
          continue;
        }

        const toolDefinition: ToolDefinition = {
          name: tool.name,
          description: `[${moduleName}] ${tool.description}`,
          schema: (tool.inputSchema || { type: 'object', properties: {} }) as JSONSchema7,
          function: async (args: Record<string, unknown>) => {
            try {
              const result = await client.callTool({
                name: tool.name,
                arguments: args,
              });
              return result.content;
            } catch (error) {
              this.logger.error(`❌ Error executing tool '${tool.name}':`, error);
              throw error;
            }
          },
        };

        this.registerTool(toolDefinition);
        this.logger.info(`📦 Registered tool: ${toolDefinition.name}`);
      }

      this.logger.success(`✅ Registered ${tools.tools.length} tools from '${moduleName}' module`);
    } catch (error) {
      this.logger.error(`❌ Failed to register tools from '${moduleName}' module:`, error);
      throw error;
    }
  }

  /**
   * Dynamically import an ES module
   */
  private dynamicImport(modulePath: string): Promise<{ default: InMemoryMCPModule }> {
    try {
      const importedModule = new Function(`return import('${modulePath}')`)();
      return importedModule;
    } catch (error) {
      this.logger.error(`❌ Failed to import module '${modulePath}':`, error);
      throw error;
    }
  }

  /**
   * Clean up resources when done
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up resources...');

    // Close each MCP client connection
    for (const [name, client] of Object.entries(this.inMemoryMCPClients)) {
      try {
        await client.close();
        this.logger.info(`✅ Closed ${name} client connection`);
      } catch (error) {
        this.logger.warn(`⚠️ Error while closing ${name} client:`, error);
      }
    }

    // Close each MCP server
    for (const [name, server] of Object.entries(this.mcpServers)) {
      try {
        if (server.close) {
          await server.close();
          this.logger.info(`✅ Closed ${name} server`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Error while closing ${name} server:`, error);
      }
    }

    // Clear references
    this.inMemoryMCPClients = {};
    this.mcpServers = {};
    this.logger.info('✅ Cleanup complete');
  }

  /**
   * Get the current working directory for filesystem operations
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Override onLLMRequest hook to capture requests for message history dump
   */
  override onLLMRequest(id: string, payload: LLMRequestHookPayload): LLMRequestHookPayload {
    // Add to message history if feature is enabled
    if (this.tarsOptions.experimental?.dumpMessageHistory) {
      this.traces.push({
        type: 'request',
        timestamp: Date.now(),
        id,
        // FIXME: redesign the trace impl, using JSONL.
        data: JSON.parse(JSON.stringify(payload)),
      });

      // Dump the message history after each request
      this.dumpMessageHistory(id);
    }

    // Call parent method to maintain original behavior
    return super.onLLMRequest(id, payload);
  }

  /**
   * Override onLLMResponse hook to capture responses for message history dump
   */
  override onLLMResponse(id: string, payload: LLMResponseHookPayload): LLMResponseHookPayload {
    // Add to message history if feature is enabled
    if (this.tarsOptions.experimental?.dumpMessageHistory) {
      this.traces.push({
        type: 'response',
        timestamp: Date.now(),
        id,
        // FIXME: redesign the trace impl, using JSONL.
        data: JSON.parse(JSON.stringify(payload)),
      });

      // Dump the message history after each response
      this.dumpMessageHistory(id);
    }

    // Call parent method to maintain original behavior
    return super.onLLMResponse(id, payload);
  }

  /**
   * Save message history to file
   * This is an experimental feature that dumps all LLM requests and responses
   * to a JSON file in the working directory.
   *
   * The file will be named using the session ID to ensure all communications
   * within the same session are stored in a single file.
   *
   * @param sessionId The session ID to use for the filename
   */
  private dumpMessageHistory(sessionId: string): void {
    try {
      if (!this.tarsOptions.experimental?.dumpMessageHistory) {
        return;
      }

      // Use sessionId for the filename to ensure we update the same file
      // throughout the session
      const filename = `session_${sessionId}.json`;
      const filePath = path.join(this.workingDirectory, filename);

      // Create a formatted JSON object with metadata
      const output = {
        agent: {
          id: this.id,
          name: this.name,
        },
        sessionId,
        timestamp: Date.now(),
        history: this.traces,
      };

      // Pretty-print the JSON for better readability
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
      this.logger.debug(`📝 Message history updated in: ${filePath}`);
    } catch (error) {
      this.logger.error('Failed to dump message history:', error);
    }
  }
}
