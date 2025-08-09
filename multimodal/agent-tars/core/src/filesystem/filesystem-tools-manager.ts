/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, JSONSchema7, Client } from '@tarko/mcp-agent';
import { ConsoleLogger } from '@tarko/mcp-agent';

/**
 * Configuration for filesystem tools manager
 */
export interface FilesystemToolsManagerConfig {
  /** Working directory for path resolution */
  workspace: string;
}

/**
 * FilesystemToolsManager - Manages filesystem tools with smart filtering
 *
 * This manager handles the registration of filesystem tools and provides
 * a safe directory_tree implementation that prevents prompt overflow.
 *
 * Key features:
 * - Filters out problematic MCP filesystem tools
 * - Provides safe directory_tree with smart filtering
 * - Maintains backward compatibility
 * - Configurable limits and exclusion patterns
 */
export class FilesystemToolsManager {
  private logger: ConsoleLogger;
  private config: FilesystemToolsManagerConfig;
  private filesystemClient?: Client;

  // Tools to exclude from MCP filesystem registration
  private readonly EXCLUDED_TOOLS = ['directory_tree'];

  // Default exclusion patterns to prevent prompt overflow
  private readonly DEFAULT_EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    'logs',
    '.cache',
    'tmp',
    'temp',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
  ];

  constructor(logger: ConsoleLogger, config: FilesystemToolsManagerConfig) {
    this.logger = logger.spawn('FilesystemToolsManager');
    this.config = config;
  }

  /**
   * Set the filesystem MCP client
   */
  setFilesystemClient(client: Client): void {
    this.filesystemClient = client;
  }

  /**
   * Register filesystem tools with filtering
   *
   * @param registerTool - Function to register a tool
   * @returns Array of registered tool names
   */
  async registerTools(registerTool: (tool: Tool) => void): Promise<string[]> {
    const registeredTools: string[] = [];

    if (!this.filesystemClient) {
      this.logger.warn('No filesystem client available for tool registration');
      return registeredTools;
    }

    try {
      // Get tools from the filesystem MCP client
      const tools = await this.filesystemClient.listTools();

      if (!tools || !Array.isArray(tools.tools)) {
        this.logger.warn('No tools returned from filesystem client');
        return registeredTools;
      }

      // Register non-excluded tools
      for (const tool of tools.tools) {
        if (!this.EXCLUDED_TOOLS.includes(tool.name)) {
          const toolDefinition = new Tool({
            id: tool.name,
            description: `[filesystem] ${tool.description}`,
            parameters: (tool.inputSchema || { type: 'object', properties: {} }) as JSONSchema7,
            function: async (args: Record<string, unknown>) => {
              try {
                const result = await this.filesystemClient!.callTool({
                  name: tool.name,
                  arguments: args,
                });
                return result.content;
              } catch (error) {
                this.logger.error(`Error executing filesystem tool '${tool.name}':`, error);
                throw error;
              }
            },
          });

          registerTool(toolDefinition);
          registeredTools.push(tool.name);
          this.logger.info(`Registered filesystem tool: ${tool.name}`);
        } else {
          this.logger.info(
            `Excluded filesystem tool: ${tool.name} (will be replaced with safe version)`,
          );
        }
      }

      // Register safe directory_tree tool
      const safeDirectoryTreeTool = this.createSafeDirectoryTreeTool();
      registerTool(safeDirectoryTreeTool);
      registeredTools.push('directory_tree');
      this.logger.info('Registered safe directory_tree tool with filtering and limits');

      this.logger.info(`Registered ${registeredTools.length} filesystem tools with safe filtering`);
      return registeredTools;
    } catch (error) {
      this.logger.error('Failed to register filesystem tools:', error);
      throw error;
    }
  }

  /**
   * Create a safe directory_tree tool that prevents prompt overflow
   */
  private createSafeDirectoryTreeTool(): Tool {
    return new Tool({
      id: 'directory_tree',
      description:
        '[filesystem] Get directory tree with smart filtering and limits to prevent prompt overflow',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to get tree structure for',
          },
          maxDepth: {
            type: 'number',
            default: 3,
            description: 'Maximum depth to traverse (default: 3)',
          },
          maxFiles: {
            type: 'number',
            default: 1000,
            description: 'Maximum number of files to include (default: 1000)',
          },
          excludePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: this.DEFAULT_EXCLUDE_PATTERNS,
            description: 'Patterns to exclude from the tree',
          },
        },
        required: ['path'],
      } as JSONSchema7,
      function: async (args: {
        path: string;
        maxDepth?: number;
        maxFiles?: number;
        excludePatterns?: string[];
      }) => {
        const {
          path: rootPath,
          maxDepth = 3,
          maxFiles = 1000,
          excludePatterns = this.DEFAULT_EXCLUDE_PATTERNS,
        } = args;

        interface TreeEntry {
          name: string;
          type: 'file' | 'directory';
          children?: TreeEntry[];
        }

        const fileCount = { value: 0 };

        const buildSafeTree = async (currentPath: string, depth = 0): Promise<TreeEntry[]> => {
          // Check depth and file count limits
          if (depth >= maxDepth || fileCount.value >= maxFiles) {
            return [];
          }

          try {
            // Use the filesystem MCP client to safely read directory
            const listResult = await this.filesystemClient!.callTool({
              name: 'list_directory',
              arguments: { path: currentPath },
            });

            if (
              !listResult?.content ||
              !Array.isArray(listResult.content) ||
              listResult.content.length === 0
            ) {
              return [];
            }

            const firstContent = listResult.content[0] as { type: string; text: string };
            if (!firstContent?.text) {
              return [];
            }

            const entries = firstContent.text
              .split('\n')
              .filter((line: string) => line.trim())
              .map((line: string) => {
                const isDir = line.startsWith('[DIR]');
                const name = line.replace(/^\[(FILE|DIR)\]\s+/, '');
                return { name, isDirectory: isDir };
              });

            const result: TreeEntry[] = [];

            for (const entry of entries) {
              if (fileCount.value >= maxFiles) break;

              // Apply exclusion patterns
              const shouldExclude = excludePatterns.some((pattern) => {
                if (pattern.includes('*')) {
                  // Simple glob matching for patterns with wildcards
                  const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\./g, '\\.'), 'i');
                  return regex.test(entry.name);
                }
                // Exact name matching for simple patterns
                return entry.name === pattern;
              });

              if (shouldExclude) {
                continue;
              }

              const entryData: TreeEntry = {
                name: entry.name,
                type: entry.isDirectory ? 'directory' : 'file',
              };

              if (entry.isDirectory) {
                const subPath = `${currentPath}/${entry.name}`;
                entryData.children = await buildSafeTree(subPath, depth + 1);
              }

              result.push(entryData);
              fileCount.value++;
            }

            return result;
          } catch (error) {
            this.logger.warn(`Failed to read directory ${currentPath}:`, error);
            return [];
          }
        };

        try {
          const treeData = await buildSafeTree(rootPath);

          // Return format consistent with original MCP directory_tree
          return [
            {
              type: 'text',
              text: JSON.stringify(treeData, null, 2),
            },
          ];
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Error in safe directory tree:', error);
          throw new Error(`Failed to generate directory tree: ${errorMessage}`);
        }
      },
    });
  }

  /**
   * Get the list of tools that will be excluded from MCP registration
   */
  getExcludedTools(): string[] {
    return [...this.EXCLUDED_TOOLS];
  }

  /**
   * Get the default exclusion patterns used for directory filtering
   */
  getDefaultExcludePatterns(): string[] {
    return [...this.DEFAULT_EXCLUDE_PATTERNS];
  }
}
