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
  InProcessMCPModule,
  MCPClient,
  AgentTARSOptions,
  BuiltInMCPModules,
  BuiltInMCPServerName,
  AgentTARSBrowserOptions,
  AgentTARSSearchOptions,
} from './types';
import { DEFAULT_SYSTEM_PROMPT } from './shared';

/**
 * A Agent TARS that uses in-process MCP tool call
 * for built-in MCP Servers.
 */
export class AgentTARS extends MCPAgent {
  private workingDirectory: string;
  private tarsOptions: AgentTARSOptions;
  private mcpModules: BuiltInMCPModules = {};

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
      mcpImpl: 'in-process',
      mcpServers: {},
      maxTokens: 10000, // Set default maxTokens to 10000 for AgentTARS
      ...options,
    };

    const { workingDirectory = process.cwd() } = tarsOptions.workspace!;

    // Under the 'in-process' implementation, the built-in mcp server will be implemented independently
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
   * Initialize in-process MCP modules and register tools
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
      this.tarsOptions.mcpImpl === 'in-process'
        ? this.initializeInProcessMCPForBuiltInMCPServers()
        : Promise.resolve(),
    ]);
  }

  /**
   * Initialzie in-process mcp for built-in mcp servers.
   */
  private async initializeInProcessMCPForBuiltInMCPServers() {
    try {
      // Dynamically import the required MCP modules
      const [searchModole, browserModule, filesystemModule, commandsModule] = await Promise.all([
        this.dynamicImport('@agent-infra/mcp-server-search'),
        this.dynamicImport('@agent-infra/mcp-server-browser'),
        this.dynamicImport('@agent-infra/mcp-server-filesystem'),
        this.dynamicImport('@agent-infra/mcp-server-commands'),
      ]);

      // Store the modules for later use
      this.mcpModules = {
        search: searchModole.default as InProcessMCPModule,
        browser: browserModule.default as InProcessMCPModule,
        filesystem: filesystemModule.default as InProcessMCPModule,
        commands: commandsModule.default as InProcessMCPModule,
      };

      // Config search.
      this.setSearchConfig(this.tarsOptions.search!);
      // Config browser.
      this.setBrowserOptions(this.tarsOptions.browser);
      // Config filesystem to use the specified working directory
      this.setAllowedDirectories([this.workingDirectory]);

      // Register tools from each module
      await this.registerToolsFromModule('search');
      await this.registerToolsFromModule('browser');
      await this.registerToolsFromModule('filesystem');
      await this.registerToolsFromModule('commands');

      this.logger.info('✅ AgentTARS initialization complete.');
    } catch (error) {
      this.logger.error('❌ Failed to initialize AgentTARS:', error);
      throw new Error(
        `Failed to initialize AgentTARS: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register tools from a specific MCP module in "in-process" mcp impl.
   */
  private async registerToolsFromModule(moduleName: BuiltInMCPServerName): Promise<void> {
    try {
      if (!this.mcpModules[moduleName]?.client) {
        this.logger.warn(`⚠️ MCP module '${moduleName}' not available or missing client`);
        return;
      }

      const moduleClient: MCPClient = this.mcpModules[moduleName].client;

      // Get tools from the module
      const tools = await moduleClient.listTools();

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
              const result = await moduleClient.callTool({
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
  private dynamicImport(modulePath: string): Promise<{
    default: InProcessMCPModule;
  }> {
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

    // Clean up each module properly
    for (const [moduleName, module] of Object.entries(this.mcpModules)) {
      try {
        if (module.client && typeof module.client.close === 'function') {
          await module.client.close();
          this.logger.info(`✅ Cleaned up ${moduleName} module`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Error while cleaning up ${moduleName} module:`, error);
      }
    }

    // Clear modules reference
    this.mcpModules = {};
    this.logger.info('✅ Cleanup complete');
  }

  /**
   * Get the current working directory for filesystem operations
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set allowed directories for filesystem access
   * @param directories Array of directory paths to allow access to
   */
  setAllowedDirectories(directories: string[]): void {
    if (this.mcpModules.filesystem?.setAllowedDirectories) {
      this.logger.info(`📁 Updated allowed directories: ${directories.join(', ')}`);
      this.mcpModules.filesystem.setAllowedDirectories(directories);
    } else {
      this.logger.warn('⚠️ Cannot set allowed directories: mcp-filesystem module not initialized,');
    }
  }

  /**
   * Set browser options.
   */
  setBrowserOptions(browserOptions: AgentTARSBrowserOptions = { headless: false }): void {
    if (this.mcpModules.browser?.setConfig) {
      this.logger.info(`📁 Set browser options: ${JSON.stringify(browserOptions)}`);
      this.mcpModules.browser.setConfig({
        launchOptions: {
          headless: browserOptions.headless,
        },
      });
    } else {
      this.logger.warn('⚠️ Cannot set browser options: mcp-browser module not initialized,');
    }
  }

  /**
   * Set search options.
   */
  setSearchConfig(searchOptions: AgentTARSSearchOptions): void {
    if (this.mcpModules.search?.setSearchConfig) {
      this.logger.info(`📁 Set search options: ${JSON.stringify(searchOptions)}`);
      this.mcpModules.search.setSearchConfig({
        // @ts-expect-error we use string literal in high-level.
        provider: searchOptions.provider,
        providerConfig: {
          count: searchOptions.count!,
          // @ts-expect-error fix the type issue later
          engine: searchOptions.browserSearch?.engine,
          needVisitedUrls: searchOptions.browserSearch?.needVisitedUrls,
        },
        // @ts-expect-error fix the type issue later
        apiKey: searchOptions.apiKey,
        baseUrl: searchOptions.baseUrl,
      });
    } else {
      this.logger.warn('⚠️ Cannot set browser options: mcp-browser module not initialized,');
    }
  }

  /**
   * Override onLLMRequest hook to capture requests for message history dump
   */
  protected override onLLMRequest(
    id: string,
    payload: LLMRequestHookPayload,
  ): LLMRequestHookPayload {
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
  protected override onLLMResponse(
    id: string,
    payload: LLMResponseHookPayload,
  ): LLMResponseHookPayload {
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
