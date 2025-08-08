import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsoleLogger, Client, Tool } from '@tarko/mcp-agent';
import { FilesystemToolsManager } from '../../src/filesystem/filesystem-tools-manager';

describe('FilesystemToolsManager', () => {
  const logger = new ConsoleLogger('test');
  let toolsManager: FilesystemToolsManager;
  let mockClient: Client;
  let registeredTools: Tool[];
  let mockRegisterTool: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    toolsManager = new FilesystemToolsManager(logger, {
      workspace: '/test/workspace',
    });

    registeredTools = [];
    mockRegisterTool = vi.fn((tool: Tool) => {
      registeredTools.push(tool);
    });

    // Mock filesystem client
    mockClient = {
      listTools: vi.fn(),
      callTool: vi.fn(),
    } as unknown as Client;
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(toolsManager).toBeDefined();
      expect(toolsManager.getExcludedTools()).toContain('directory_tree');
    });

    it('should have default exclusion patterns', () => {
      const patterns = toolsManager.getDefaultExcludePatterns();
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('.git');
      expect(patterns).toContain('dist');
      expect(patterns).toContain('build');
    });
  });

  describe('tool registration', () => {
    it('should register tools when filesystem client is available', async () => {
      // Mock filesystem tools response
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
            description: 'Get directory tree structure',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
        ],
      };

      vi.mocked(mockClient.listTools).mockResolvedValue(mockTools);
      toolsManager.setFilesystemClient(mockClient);

      const toolNames = await toolsManager.registerTools(mockRegisterTool);

      // Should register non-excluded tools + safe directory_tree
      expect(toolNames).toContain('list_directory');
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('directory_tree');
      expect(toolNames).toHaveLength(3);
      expect(mockRegisterTool).toHaveBeenCalledTimes(3);
    });

    it('should exclude problematic tools from MCP registration', async () => {
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
      toolsManager.setFilesystemClient(mockClient);

      await toolsManager.registerTools(mockRegisterTool);

      // Verify that the original directory_tree was excluded and replaced
      const toolNames = registeredTools.map((tool) => tool.id);

      expect(toolNames).toContain('list_directory');
      expect(toolNames).toContain('directory_tree'); // Safe version
      expect(toolNames).toHaveLength(2);
    });

    it('should return empty array when no filesystem client is set', async () => {
      const toolNames = await toolsManager.registerTools(mockRegisterTool);

      expect(toolNames).toEqual([]);
      expect(mockRegisterTool).not.toHaveBeenCalled();
    });

    it('should handle client errors gracefully', async () => {
      vi.mocked(mockClient.listTools).mockRejectedValue(new Error('Client error'));
      toolsManager.setFilesystemClient(mockClient);

      await expect(toolsManager.registerTools(mockRegisterTool)).rejects.toThrow('Client error');
    });
  });

  describe('safe directory_tree tool', () => {
    beforeEach(() => {
      const mockTools = {
        tools: [
          {
            name: 'list_directory',
            description: 'List directory contents',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
          },
        ],
      };

      vi.mocked(mockClient.listTools).mockResolvedValue(mockTools);
      toolsManager.setFilesystemClient(mockClient);
    });

    it('should create safe directory_tree tool with correct parameters', async () => {
      await toolsManager.registerTools(mockRegisterTool);

      const directoryTreeTool = registeredTools.find((tool) => tool.id === 'directory_tree');
      expect(directoryTreeTool).toBeDefined();
      expect(directoryTreeTool!.description).toContain('smart filtering and limits');

      // Check parameters schema
      const params = directoryTreeTool!.parameters as any;
      expect(params.properties.path).toBeDefined();
      expect(params.properties.maxDepth).toBeDefined();
      expect(params.properties.maxFiles).toBeDefined();
      expect(params.properties.excludePatterns).toBeDefined();
    });

    it('should apply exclusion patterns correctly', async () => {
      // Mock list_directory response with various files/directories
      const mockListResponse = {
        content: [
          {
            type: 'text',
            text: '[DIR] src\n[DIR] node_modules\n[FILE] package.json\n[DIR] .git\n[FILE] README.md',
          },
        ],
      };

      vi.mocked(mockClient.callTool).mockResolvedValue(mockListResponse);

      await toolsManager.registerTools(mockRegisterTool);

      const directoryTreeTool = registeredTools.find((tool) => tool.id === 'directory_tree');
      expect(directoryTreeTool).toBeDefined();

      // Execute the tool function
      const result = await directoryTreeTool!.function({ path: '/test' });

      expect(result.content[0].text).toContain('src');
      expect(result.content[0].text).toContain('package.json');
      expect(result.content[0].text).toContain('README.md');
      expect(result.content[0].text).not.toContain('node_modules');
      expect(result.content[0].text).not.toContain('.git');
    });

    it('should respect depth limits', async () => {
      // Mock nested directory structure
      const mockResponses = [
        {
          content: [
            {
              type: 'text',
              text: '[DIR] level1\n[FILE] file1.txt',
            },
          ],
        },
        {
          content: [
            {
              type: 'text',
              text: '[DIR] level2\n[FILE] file2.txt',
            },
          ],
        },
        {
          content: [
            {
              type: 'text',
              text: '[DIR] level3\n[FILE] file3.txt',
            },
          ],
        },
        {
          content: [
            {
              type: 'text',
              text: '[FILE] file4.txt',
            },
          ],
        },
      ];

      let callCount = 0;
      vi.mocked(mockClient.callTool).mockImplementation(() => {
        return Promise.resolve(
          mockResponses[callCount++] || mockResponses[mockResponses.length - 1],
        );
      });

      await toolsManager.registerTools(mockRegisterTool);

      const directoryTreeTool = registeredTools.find((tool) => tool.id === 'directory_tree');
      expect(directoryTreeTool).toBeDefined();

      // Execute with maxDepth = 2
      const result = await directoryTreeTool!.function({
        path: '/test',
        maxDepth: 2,
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('level1');
      expect(resultText).toContain('level2');
      expect(resultText).not.toContain('level3'); // Should be cut off at depth 2
    });

    it('should respect file count limits', async () => {
      // Mock response with many files
      const mockListResponse = {
        content: [
          {
            type: 'text',
            text: Array.from({ length: 50 }, (_, i) => `[FILE] file${i}.txt`).join('\n'),
          },
        ],
      };

      vi.mocked(mockClient.callTool).mockResolvedValue(mockListResponse);

      const mockRegisterTool = vi.fn((tool: Tool) => {
        registeredTools.push(tool);
      });

      await toolsManager.registerTools(mockRegisterTool);

      const directoryTreeTool = registeredTools.find((tool) => tool.id === 'directory_tree');
      expect(directoryTreeTool).toBeDefined();

      // Execute with maxFiles = 10
      const result = await directoryTreeTool!.function({
        path: '/test',
        maxFiles: 10,
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('files included: 10/10');
    });

    it('should handle directory read errors gracefully', async () => {
      vi.mocked(mockClient.callTool).mockRejectedValue(new Error('Permission denied'));

      const mockRegisterTool = vi.fn((tool: Tool) => {
        registeredTools.push(tool);
      });

      await toolsManager.registerTools(mockRegisterTool);

      const directoryTreeTool = registeredTools.find((tool) => tool.id === 'directory_tree');
      expect(directoryTreeTool).toBeDefined();

      await expect(directoryTreeTool!.function({ path: '/test' })).rejects.toThrow(
        'Failed to generate directory tree',
      );
    });

    it('should handle custom exclusion patterns', async () => {
      const mockListResponse = {
        content: [
          {
            type: 'text',
            text: '[DIR] src\n[DIR] custom_exclude\n[FILE] package.json\n[FILE] test.log',
          },
        ],
      };

      vi.mocked(mockClient.callTool).mockResolvedValue(mockListResponse);

      const mockRegisterTool = vi.fn((tool: Tool) => {
        registeredTools.push(tool);
      });

      await toolsManager.registerTools(mockRegisterTool);

      const directoryTreeTool = registeredTools.find((tool) => tool.id === 'directory_tree');
      expect(directoryTreeTool).toBeDefined();

      // Execute with custom exclusion patterns
      const result = await directoryTreeTool!.function({
        path: '/test',
        excludePatterns: ['custom_exclude', '*.log'],
      });

      const resultText = result.content[0].text;
      expect(resultText).toContain('src');
      expect(resultText).toContain('package.json');
      expect(resultText).not.toContain('custom_exclude');
      expect(resultText).not.toContain('test.log');
    });
  });

  describe('utility methods', () => {
    it('should return correct excluded tools list', () => {
      const excludedTools = toolsManager.getExcludedTools();
      expect(excludedTools).toContain('directory_tree');
      expect(excludedTools).toHaveLength(1);
    });

    it('should return default exclude patterns', () => {
      const patterns = toolsManager.getDefaultExcludePatterns();
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('.git');
      expect(patterns).toContain('dist');
      expect(patterns).toContain('build');
      expect(patterns).toContain('.next');
      expect(patterns).toContain('.nuxt');
      expect(patterns).toContain('coverage');
      expect(patterns).toContain('.nyc_output');
      expect(patterns).toContain('logs');
      expect(patterns).toContain('.cache');
      expect(patterns).toContain('tmp');
      expect(patterns).toContain('temp');
      expect(patterns).toContain('*.log');
      expect(patterns).toContain('.DS_Store');
      expect(patterns).toContain('Thumbs.db');
    });

    it('should not mutate original arrays when returning copies', () => {
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
