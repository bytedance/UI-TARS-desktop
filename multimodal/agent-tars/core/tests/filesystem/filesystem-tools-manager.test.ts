import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsoleLogger, Client } from '@tarko/mcp-agent';
import { FilesystemToolsManager } from '../../src/filesystem/filesystem-tools-manager';

describe('FilesystemToolsManager', () => {
  const logger = new ConsoleLogger('test');
  let toolsManager: FilesystemToolsManager;
  let mockClient: Client;
  let registeredToolNames: string[];
  let mockRegisterTool: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    toolsManager = new FilesystemToolsManager(logger, {
      workspace: '/test/workspace',
    });

    registeredToolNames = [];
    mockRegisterTool = vi.fn((tool) => {
      registeredToolNames.push(tool.name || tool.id || 'unknown');
    });

    mockClient = {
      listTools: vi.fn(),
      callTool: vi.fn(),
    } as unknown as Client;
  });

  describe('basic functionality', () => {
    it('should initialize correctly', () => {
      expect(toolsManager).toBeDefined();
      expect(toolsManager.getExcludedTools()).toEqual(['directory_tree']);
    });

    it('should have sensible default exclusion patterns', () => {
      const patterns = toolsManager.getDefaultExcludePatterns();
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('.git');
      expect(patterns.length).toBeGreaterThan(5);
    });

    it('should return empty array when no client is set', async () => {
      const result = await toolsManager.registerTools(mockRegisterTool);
      expect(result).toEqual([]);
      expect(mockRegisterTool).not.toHaveBeenCalled();
    });
  });

  describe('tool registration', () => {
    beforeEach(() => {
      toolsManager.setFilesystemClient(mockClient);
    });

    it('should register tools and replace directory_tree', async () => {
      const mockTools = {
        tools: [
          {
            name: 'list_directory',
            description: 'List directory contents',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
          {
            name: 'read_file',
            description: 'Read file contents',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
          {
            name: 'directory_tree',
            description: 'Original problematic directory tree',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
        ],
      };

      vi.mocked(mockClient.listTools).mockResolvedValue(mockTools);

      const toolNames = await toolsManager.registerTools(mockRegisterTool);

      // Should register 3 tools: list_directory + read_file + safe directory_tree
      expect(toolNames).toEqual(['list_directory', 'read_file', 'directory_tree']);
      expect(registeredToolNames).toEqual(['list_directory', 'read_file', 'directory_tree']);
      expect(mockRegisterTool).toHaveBeenCalledTimes(3);
    });

    it('should handle client errors', async () => {
      vi.mocked(mockClient.listTools).mockRejectedValue(new Error('Client error'));

      await expect(toolsManager.registerTools(mockRegisterTool)).rejects.toThrow('Client error');
    });

    it('should exclude directory_tree from MCP tools', async () => {
      const mockTools = {
        tools: [
          {
            name: 'list_directory',
            description: 'List directory contents',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
          {
            name: 'directory_tree',
            description: 'Original problematic directory tree',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
        ],
      };

      vi.mocked(mockClient.listTools).mockResolvedValue(mockTools);

      const toolNames = await toolsManager.registerTools(mockRegisterTool);

      // Should register list_directory + safe directory_tree (original excluded)
      expect(toolNames).toEqual(['list_directory', 'directory_tree']);
      expect(registeredToolNames).toEqual(['list_directory', 'directory_tree']);
    });
  });

  describe('utility methods', () => {
    it('should return immutable arrays', () => {
      const excludedTools1 = toolsManager.getExcludedTools();
      const excludedTools2 = toolsManager.getExcludedTools();
      const patterns1 = toolsManager.getDefaultExcludePatterns();
      const patterns2 = toolsManager.getDefaultExcludePatterns();

      // Modify returned arrays
      excludedTools1.push('test_tool');
      patterns1.push('test_pattern');

      // Original should remain unchanged
      expect(excludedTools2).not.toContain('test_tool');
      expect(patterns2).not.toContain('test_pattern');
    });
  });
});
