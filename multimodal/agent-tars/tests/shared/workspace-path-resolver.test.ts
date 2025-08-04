import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import {
  WorkspacePathResolver,
  DEFAULT_PATH_PARAMETER_MAPPING,
  type WorkspacePathResolverConfig,
  type PathParameterMapping,
  type ToolCallArgs,
} from '../../src/shared/workspace-path-resolver';

describe('WorkspacePathResolver', () => {
  let resolver: WorkspacePathResolver;
  let config: WorkspacePathResolverConfig;
  const testWorkingDir = '/workspace/test-project';

  beforeEach(() => {
    config = { workspace: testWorkingDir };
    resolver = new WorkspacePathResolver(config);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      expect(resolver.getWorkingDirectory()).toBe(testWorkingDir);
    });

    it('should initialize with custom path mapping', () => {
      const customMapping: PathParameterMapping = {
        custom_tool: ['custom_path'],
      };
      const customResolver = new WorkspacePathResolver(config, customMapping);

      expect(customResolver.hasPathParameters('custom_tool')).toBe(true);
      expect(customResolver.getPathParameters('custom_tool')).toEqual(['custom_path']);
    });

    it('should use default path mapping when not provided', () => {
      expect(resolver.hasPathParameters('write_file')).toBe(true);
      expect(resolver.getPathParameters('write_file')).toEqual(['path']);
    });
  });

  describe('Path Resolution', () => {
    describe('Single Path Parameters', () => {
      it('should resolve relative path to absolute path', () => {
        const args: ToolCallArgs = { path: 'src/index.ts' };
        const result = resolver.resolveToolPaths('write_file', args);

        expect(result.path).toBe(path.join(testWorkingDir, 'src/index.ts'));
      });

      it('should preserve absolute paths unchanged', () => {
        const absolutePath = '/absolute/path/to/file.ts';
        const args: ToolCallArgs = { path: absolutePath };
        const result = resolver.resolveToolPaths('write_file', args);

        expect(result.path).toBe(absolutePath);
      });

      it('should handle empty or whitespace-only paths', () => {
        const emptyArgs: ToolCallArgs = { path: '' };
        const whitespaceArgs: ToolCallArgs = { path: '   ' };

        const emptyResult = resolver.resolveToolPaths('write_file', emptyArgs);
        const whitespaceResult = resolver.resolveToolPaths('write_file', whitespaceArgs);

        expect(emptyResult.path).toBe('');
        expect(whitespaceResult.path).toBe('   ');
      });

      it('should handle non-string path values', () => {
        const args: ToolCallArgs = {
          path: 123,
          otherParam: 'value',
        };
        const result = resolver.resolveToolPaths('write_file', args);

        // Non-string values should remain unchanged
        expect(result.path).toBe(123);
        expect(result.otherParam).toBe('value');
      });
    });

    describe('Multiple Path Parameters', () => {
      it('should resolve multiple path parameters for move_file tool', () => {
        const args: ToolCallArgs = {
          source: 'src/old.ts',
          destination: 'src/new.ts',
        };
        const result = resolver.resolveToolPaths('move_file', args);

        expect(result.source).toBe(path.join(testWorkingDir, 'src/old.ts'));
        expect(result.destination).toBe(path.join(testWorkingDir, 'src/new.ts'));
      });

      it('should handle mixed absolute and relative paths', () => {
        const absolutePath = '/absolute/destination.ts';
        const args: ToolCallArgs = {
          source: 'relative/source.ts',
          destination: absolutePath,
        };
        const result = resolver.resolveToolPaths('move_file', args);

        expect(result.source).toBe(path.join(testWorkingDir, 'relative/source.ts'));
        expect(result.destination).toBe(absolutePath);
      });
    });

    describe('Command Tools with CWD', () => {
      it('should resolve cwd parameter for run_command tool', () => {
        const args: ToolCallArgs = {
          command: 'npm test',
          cwd: 'packages/frontend',
        };
        const result = resolver.resolveToolPaths('run_command', args);

        expect(result.cwd).toBe(path.join(testWorkingDir, 'packages/frontend'));
        expect(result.command).toBe('npm test');
      });
    });
  });

  describe('Tool Path Parameter Management', () => {
    it('should correctly identify tools with path parameters', () => {
      expect(resolver.hasPathParameters('write_file')).toBe(true);
      expect(resolver.hasPathParameters('read_file')).toBe(true);
      expect(resolver.hasPathParameters('unknown_tool')).toBe(false);
    });

    it('should return correct path parameters for known tools', () => {
      expect(resolver.getPathParameters('write_file')).toEqual(['path']);
      expect(resolver.getPathParameters('move_file')).toEqual(['source', 'destination']);
      expect(resolver.getPathParameters('run_command')).toEqual(['cwd']);
      expect(resolver.getPathParameters('unknown_tool')).toEqual([]);
    });

    it('should handle tools without path parameters', () => {
      const args: ToolCallArgs = {
        someParam: 'value',
        anotherParam: 42,
      };
      const result = resolver.resolveToolPaths('unknown_tool', args);

      // Args should remain unchanged for tools without path parameters
      expect(result).toEqual(args);
      expect(result).not.toBe(args); // Should return a copy
    });
  });

  describe('Default Path Parameter Mapping', () => {
    it('should include all expected filesystem tools', () => {
      const filesystemTools = [
        'write_file',
        'read_file',
        'edit_file',
        'create_directory',
        'list_directory',
        'directory_tree',
        'search_files',
        'get_file_info',
      ];

      filesystemTools.forEach((tool) => {
        expect(DEFAULT_PATH_PARAMETER_MAPPING[tool]).toBeDefined();
        expect(DEFAULT_PATH_PARAMETER_MAPPING[tool]).toContain('path');
      });
    });

    it('should include file operation tools with multiple paths', () => {
      expect(DEFAULT_PATH_PARAMETER_MAPPING['move_file']).toEqual(['source', 'destination']);
    });

    it('should include command tools with cwd parameter', () => {
      expect(DEFAULT_PATH_PARAMETER_MAPPING['run_command']).toEqual(['cwd']);
      expect(DEFAULT_PATH_PARAMETER_MAPPING['run_script']).toEqual(['cwd']);
    });

    it('should include read_multiple_files with paths parameter', () => {
      expect(DEFAULT_PATH_PARAMETER_MAPPING['read_multiple_files']).toEqual(['paths']);
    });
  });

  describe('Custom Path Mapping', () => {
    it('should add new path mappings without affecting existing ones', () => {
      const additionalMapping: PathParameterMapping = {
        custom_tool: ['custom_path'],
        another_tool: ['dir1', 'dir2'],
      };

      resolver.addPathMapping(additionalMapping);

      // New mappings should be available
      expect(resolver.hasPathParameters('custom_tool')).toBe(true);
      expect(resolver.getPathParameters('custom_tool')).toEqual(['custom_path']);
      expect(resolver.getPathParameters('another_tool')).toEqual(['dir1', 'dir2']);

      // Existing mappings should remain intact
      expect(resolver.hasPathParameters('write_file')).toBe(true);
      expect(resolver.getPathParameters('write_file')).toEqual(['path']);
    });

    it('should override existing mappings when adding duplicates', () => {
      const overrideMapping: PathParameterMapping = {
        write_file: ['new_path_param'],
      };

      resolver.addPathMapping(overrideMapping);

      expect(resolver.getPathParameters('write_file')).toEqual(['new_path_param']);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined or null arguments gracefully', () => {
      const result1 = resolver.resolveToolPaths('write_file', undefined);
      const result2 = resolver.resolveToolPaths('write_file', null);

      expect(result1).toEqual({});
      expect(result2).toEqual({});
    });

    it('should preserve non-path parameters unchanged', () => {
      const args: ToolCallArgs = {
        path: 'relative/path.ts',
        content: 'file content',
      };

      const result = resolver.resolveToolPaths('write_file', args);

      expect(result.path).toBe(path.join(testWorkingDir, 'relative/path.ts'));
      expect(result.content).toBe('file content');
    });

    it('should work with different working directory formats', () => {
      const absoluteWorkingDir = path.resolve('/workspace/project');
      const config = { workspace: absoluteWorkingDir };
      const testResolver = new WorkspacePathResolver(config);

      const args: ToolCallArgs = { path: 'src/file.ts' };
      const result = testResolver.resolveToolPaths('write_file', args);

      expect(result.path).toBe(path.join(absoluteWorkingDir, 'src/file.ts'));
    });

    it('should handle complex relative paths with .. and .', () => {
      const args: ToolCallArgs = {
        path: '../sibling/./file.ts',
      };
      const result = resolver.resolveToolPaths('write_file', args);

      expect(result.path).toBe(path.resolve(testWorkingDir, '../sibling/./file.ts'));
    });
  });

  describe('Immutability', () => {
    it('should not mutate original arguments object', () => {
      const originalArgs: ToolCallArgs = {
        path: 'relative/path.ts',
        content: 'original content',
      };
      const argsCopy = { ...originalArgs };

      resolver.resolveToolPaths('write_file', originalArgs);

      // Original args should remain unchanged
      expect(originalArgs).toEqual(argsCopy);
    });

    it('should return a new object with resolved paths', () => {
      const args: ToolCallArgs = { path: 'relative/path.ts' };
      const result = resolver.resolveToolPaths('write_file', args);

      expect(result).not.toBe(args);
      // 路径应该被解析，所以值会不同
      expect(result.path).toBe(path.join(testWorkingDir, 'relative/path.ts'));
      expect(result.path).not.toBe(args.path);
    });
  });

  describe('Array Path Parameters', () => {
    it('should resolve array of paths for read_multiple_files', () => {
      const args: ToolCallArgs = {
        paths: ['src/file1.ts', 'src/file2.ts', '/absolute/file3.ts'],
      };
      const result = resolver.resolveToolPaths('read_multiple_files', args);

      expect(result.paths).toEqual([
        path.join(testWorkingDir, 'src/file1.ts'),
        path.join(testWorkingDir, 'src/file2.ts'),
        '/absolute/file3.ts',
      ]);
    });

    it('should handle empty or invalid paths in arrays', () => {
      const args: ToolCallArgs = {
        paths: ['src/file1.ts', '', '   ', 'src/file2.ts'],
      };
      const result = resolver.resolveToolPaths('read_multiple_files', args);

      expect(result.paths).toEqual([
        path.join(testWorkingDir, 'src/file1.ts'),
        '',
        '   ',
        path.join(testWorkingDir, 'src/file2.ts'),
      ]);
    });
  });
});
