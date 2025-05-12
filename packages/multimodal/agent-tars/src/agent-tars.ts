/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition, JSONSchema7, MCPAgent, MCPServerRegistry } from '@multimodal/agent';
import {
  InProcessMCPModule,
  MCPClient,
  AgentTARSOptions,
  BuiltInMCPModules,
  BuiltInMCPServerName,
  AgentTARSBrowserOptions,
} from './types';
import { handleOptions } from './shared';

/**
 * A TARS Agent that uses in-process MCP tool call
 * for built-in MCP Servers.
 */
export class AgentTARS extends MCPAgent {
  private workingDirectory: string;
  private tarsOptions: AgentTARSOptions;
  private mcpModules: BuiltInMCPModules = {};

  constructor(options: AgentTARSOptions) {
    const { instructions, workingDirectory } = handleOptions(options);

    // Under the 'in-process' implementation, the built-in mcp server will be implemented independently
    // Note that the usage of the attached mcp server will be the same as the implementation,
    // because we cannot determine whether it supports same-process calls.
    const mcpServers: MCPServerRegistry = {
      ...(options.mcpImpl === 'stdio'
        ? {
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
      instructions,
      mcpServers,
    });

    this.logger = this.logger.spawn('AgentTARS');
    this.workingDirectory = workingDirectory;
    this.tarsOptions = options;
    this.logger.info(`🤖 AgentTARS initialized | Working directory: ${this.workingDirectory}`);
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
      const [browserModule, filesystemModule, commandsModule] = await Promise.all([
        this.dynamicImport('@agent-infra/mcp-server-browser'),
        this.dynamicImport('@agent-infra/mcp-server-filesystem'),
        this.dynamicImport('@agent-infra/mcp-server-commands'),
      ]);

      // Store the modules for later use
      this.mcpModules = {
        browser: browserModule.default as InProcessMCPModule,
        filesystem: filesystemModule.default as InProcessMCPModule,
        commands: commandsModule.default as InProcessMCPModule,
      };

      // Configure filesystem to use the specified working directory
      this.setAllowedDirectories([this.workingDirectory]);
      // Config browser.
      this.setBrowserOptions(this.tarsOptions.browser);

      // Register tools from each module
      await this.registerToolsFromModule('browser');
      await this.registerToolsFromModule('filesystem');
      await this.registerToolsFromModule('commands');

      this.logger.info('✅ InProcessMCPAgentTARS initialization complete.');
    } catch (error) {
      this.logger.error('❌ Failed to initialize InProcessMCPAgentTARS:', error);
      throw new Error(
        `Failed to initialize InProcessMCPAgentTARS: ${error instanceof Error ? error.message : String(error)}`,
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
        const toolDefinition: ToolDefinition = {
          name: `${moduleName}__${tool.name}`,
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
      this.mcpModules.filesystem.setAllowedDirectories(directories);
      this.logger.info(`📁 Updated allowed directories: ${directories.join(', ')}`);
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
}
