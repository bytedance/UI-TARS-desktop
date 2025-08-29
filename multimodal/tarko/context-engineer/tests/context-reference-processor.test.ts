/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChatCompletionContentPart } from '@tarko/agent-interface';
import fs from 'fs';
import path from 'path';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { ContextReferenceProcessor } from '../src/node/context-reference-processor';

describe('ContextReferenceProcessor', () => {
  let processor: ContextReferenceProcessor;
  let testWorkspace: string;

  beforeEach(() => {
    testWorkspace = '/test/workspace';
    processor = new ContextReferenceProcessor({
      maxFileSize: 1024 * 1024, // 1MB
      ignoreExtensions: ['.png', '.jpg'],
      ignoreDirs: ['node_modules'],
      maxDepth: 5,
    });

    // Mock fs module
    vi.mock('fs', () => ({
      default: {
        existsSync: vi.fn(),
        statSync: vi.fn(),
        readFileSync: vi.fn(),
      },
    }));

    vi.mock('path', async () => {
      const actual = await vi.importActual('path');
      return {
        ...actual,
        resolve: vi.fn((basePath: string, relativePath: string) => {
          if (basePath === testWorkspace) {
            return path.join(testWorkspace, relativePath);
          }
          return path.resolve(basePath, relativePath);
        }),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processContextualReferences', () => {
    it('should return null for non-string queries', async () => {
      const arrayQuery: ChatCompletionContentPart[] = [{ type: 'text', text: 'hello' }];
      const result = await processor.processContextualReferences(arrayQuery, testWorkspace);
      expect(result).toBeNull();
    });

    it('should return null for queries without references', async () => {
      const query = 'This is a simple query without references';
      const result = await processor.processContextualReferences(query, testWorkspace);
      expect(result).toBeNull();
    });

    it('should process @file: references successfully', async () => {
      // Mock file system calls
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(fs.readFileSync).mockReturnValue('Hello from test1.txt');

      const query = 'Please check @file:test1.txt for content';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<file path="test1.txt">
        Hello from test1.txt
        </file>"
      `
      );
    });

    it('should process multiple @file: references', async () => {
      // Mock file system calls
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: string) => {
        if (filePath.includes('test1.txt')) {
          return 'Hello from test1.txt';
        }
        if (filePath.includes('test2.js')) {
          return 'const test = "Hello from test2.js";';
        }
        return 'default content';
      });

      const query = 'Check @file:test1.txt and @file:test-dir/test2.js';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<file path="test1.txt">
        Hello from test1.txt
        </file>

        <file path="test-dir/test2.js">
        const test = "Hello from test2.js";
        </file>"
      `
      );
    });

    it('should process @dir: references successfully', async () => {
      // Mock WorkspacePack.packPaths method
      const mockPackResult = {
        processedPaths: ['/test/workspace/test-dir'],
        files: [],
        packedContent: `=== Workspace Content Summary ===
Processed Paths: 1
Total Files: 1

--- File: /test/workspace/test-dir/test2.js ---
const test = "Hello from test2.js";
--- End of test2.js ---`,
        stats: { totalFiles: 1, totalSize: 100, errorCount: 0 },
      };

      vi.spyOn(processor['workspacePack'], 'packPaths').mockResolvedValue(mockPackResult);

      const query = 'Analyze @dir:test-dir directory';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toContain('<directory path="test-dir">');
      expect(result).toContain('Workspace Content Summary');
    });

    it('should handle non-existent file references gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock file not found
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const query = 'Check @file:non-existent.txt';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<file path="non-existent.txt">
        Error: File not found
        </file>"
      `
      );
      expect(consoleSpy).toHaveBeenCalledWith('File reference not found: non-existent.txt');

      consoleSpy.mockRestore();
    });

    it('should prevent path traversal attacks for files', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const query = 'Check @file:../../../etc/passwd';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<file path="../../../etc/passwd">
        Error: File reference outside workspace
        </file>"
      `
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'File reference outside workspace: ../../../etc/passwd',
      );

      consoleSpy.mockRestore();
    });

    it('should prevent path traversal attacks for directories', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const query = 'Analyze @dir:../../../etc';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Directory reference outside workspace: ../../../etc',
      );

      consoleSpy.mockRestore();
    });

    it('should handle file read errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock file exists but read fails
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const query = 'Check @file:restricted.txt';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<file path="restricted.txt">
        Error: Failed to read file
        </file>"
      `
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read file restricted.txt:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle workspace packing errors for directories', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock WorkspacePack to throw an error
      vi.spyOn(processor['workspacePack'], 'packPaths').mockRejectedValue(
        new Error('Packing failed'),
      );

      const query = 'Analyze @dir:test-dir';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<directory path="test-dir">
        Error: Failed to pack directory
        </directory>"
      `
      );
      expect(consoleSpy).toHaveBeenCalledWith('Failed to pack workspace paths:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle mixed @file: and @dir: references', async () => {
      // Mock file system calls for file reference
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(fs.readFileSync).mockReturnValue('Hello from test1.txt');

      // Mock WorkspacePack.packPaths method for directory reference
      const mockPackResult = {
        processedPaths: ['/test/workspace/test-dir'],
        files: [],
        packedContent: 'Directory content here',
        stats: { totalFiles: 1, totalSize: 100, errorCount: 0 },
      };

      vi.spyOn(processor['workspacePack'], 'packPaths').mockResolvedValue(mockPackResult);

      const query = 'Check @file:test1.txt and analyze @dir:test-dir';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toContain('Hello from test1.txt');
      expect(result).toContain('Directory content here');
    });

    it('should handle references with special regex characters', async () => {
      // Mock file system calls
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(fs.readFileSync).mockReturnValue('special content');

      const query = 'Check @file:test[special].txt';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(
        `
        "<file path="test[special].txt">
        special content
        </file>"
      `
      );
    });
  });

  describe('constructor options', () => {
    it('should use default options when none provided', () => {
      const defaultProcessor = new ContextReferenceProcessor();
      expect(defaultProcessor).toBeInstanceOf(ContextReferenceProcessor);
    });

    it('should accept custom options', () => {
      const customProcessor = new ContextReferenceProcessor({
        maxFileSize: 500,
        ignoreExtensions: ['.custom'],
        ignoreDirs: ['custom-dir'],
        maxDepth: 3,
      });
      expect(customProcessor).toBeInstanceOf(ContextReferenceProcessor);
    });
  });
});
