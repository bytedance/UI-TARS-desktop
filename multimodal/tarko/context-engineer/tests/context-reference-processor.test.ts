import type { ChatCompletionContentPart } from '@tarko/agent-interface';
import fs from 'fs';
import path from 'path';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { ContextReferenceProcessor } from '../src/node/context-reference-processor';

describe('ContextReferenceProcessor', () => {
  let processor: ContextReferenceProcessor;
  let testWorkspace: string;
  let testFile1: string;
  let testFile2: string;
  let testDir: string;

  beforeAll(async () => {
    // Setup test workspace
    testWorkspace = path.join(__dirname, 'test-workspace');
    testDir = path.join(testWorkspace, 'test-dir');
    testFile1 = path.join(testWorkspace, 'test1.txt');
    testFile2 = path.join(testDir, 'test2.js');

    // Create test directory structure
    fs.mkdirSync(testWorkspace, { recursive: true });
    fs.mkdirSync(testDir, { recursive: true });

    // Create test files
    fs.writeFileSync(testFile1, 'Hello from test1.txt');
    fs.writeFileSync(testFile2, 'const test = "Hello from test2.js";');

    processor = new ContextReferenceProcessor({
      maxFileSize: 1024 * 1024, // 1MB
      ignoreExtensions: ['.png', '.jpg'],
      ignoreDirs: ['node_modules'],
      maxDepth: 5,
    });
  });

  afterAll(() => {
    // Cleanup test workspace
    try {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('processContextualReferences', () => {
    it('should return non-string queries unchanged', async () => {
      const arrayQuery: ChatCompletionContentPart[] = [{ type: 'text', text: 'hello' }];
      const result = await processor.processContextualReferences(arrayQuery, testWorkspace);
      expect(result).toBe(arrayQuery);
    });

    it('should return queries without references unchanged', async () => {
      const query = 'This is a simple query without references';
      const result = await processor.processContextualReferences(query, testWorkspace);
      expect(result).toMatchInlineSnapshot(`"This is a simple query without references"`);
    });

    it('should process @file: references successfully', async () => {
      const query = 'Please check @file:test1.txt for content';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(typeof result).toBe('string');
      expect(result).toMatchInlineSnapshot(`
        "<file path="test1.txt">
        Hello from test1.txt
        </file>

        Please check @file:test1.txt for content"
      `);
    });

    it('should process multiple @file: references', async () => {
      const query = 'Check @file:test1.txt and @file:test-dir/test2.js';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(typeof result).toBe('string');
      expect(result).toMatchInlineSnapshot(`
        "<file path="test1.txt">
        Hello from test1.txt
        </file>

        <file path="test-dir/test2.js">
        const test = "Hello from test2.js";
        </file>

        Check @file:test1.txt and @file:test-dir/test2.js"
      `);
    });

    it('should process @dir: references successfully', async () => {
      const query = 'Analyze @dir:test-dir directory';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(typeof result).toBe('string');
      // Use a more flexible assertion for directory content since paths can vary
      expect(result).toContain('Workspace Content Summary');
      expect(result).toContain('test2.js');
      expect(result).toContain('Hello from test2.js');
    });

    it('should handle non-existent file references gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const query = 'Check @file:non-existent.txt';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(`
        "<file path="non-existent.txt">
        Error: File not found
        </file>

        Check @file:non-existent.txt"
      `);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File reference not found: non-existent.txt'),
      );

      consoleSpy.mockRestore();
    });

    it('should prevent path traversal attacks for files', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const query = 'Check @file:../../../etc/passwd';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(`
        "<file path="../../../etc/passwd">
        Error: File reference outside workspace
        </file>

        Check @file:../../../etc/passwd"
      `);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File reference outside workspace: ../../../etc/passwd'),
      );

      consoleSpy.mockRestore();
    });

    it('should prevent path traversal attacks for directories', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const query = 'Analyze @dir:../../../etc';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(`"Analyze @dir:../../../etc"`);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Directory reference outside workspace: ../../../etc'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle file read errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a file and then make it unreadable (simulate permission error)
      const restrictedFile = path.join(testWorkspace, 'restricted.txt');
      fs.writeFileSync(restrictedFile, 'secret content');

      // Mock fs.readFileSync to throw an error
      const originalReadFile = fs.readFileSync;
      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, ...args) => {
        if (filePath === restrictedFile) {
          throw new Error('Permission denied');
        }
        return originalReadFile(filePath, ...args);
      });

      const query = 'Check @file:restricted.txt';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(`
        "<file path="restricted.txt">
        Error: Failed to read file
        </file>

        Check @file:restricted.txt"
      `);
      expect(consoleSpy).toHaveBeenCalled();

      // Restore mocks
      vi.restoreAllMocks();
      consoleSpy.mockRestore();

      // Cleanup
      try {
        fs.unlinkSync(restrictedFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should handle workspace packing errors for directories', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock WorkspacePack to throw an error
      const mockPackPaths = vi.fn().mockRejectedValue(new Error('Packing failed'));
      processor['workspacePack'].packPaths = mockPackPaths;

      const query = 'Analyze @dir:test-dir';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(`
        "<directory path="test-dir">
        Error: Failed to pack directory
        </directory>

        Analyze @dir:test-dir"
      `);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to pack workspace paths:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle mixed @file: and @dir: references', async () => {
      const query = 'Check @file:test1.txt and analyze @dir:test-dir';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(typeof result).toBe('string');
      // For mixed references, keep some flexible assertions since directory content can vary
      expect(result).toMatchFileSnapshot('Hello from test1.txt');
    });

    it('should handle references with special regex characters', async () => {
      // Create a file with special characters in name
      const specialFile = path.join(testWorkspace, 'test[special].txt');
      fs.writeFileSync(specialFile, 'special content');

      const query = 'Check @file:test[special].txt';
      const result = await processor.processContextualReferences(query, testWorkspace);

      expect(result).toMatchInlineSnapshot(`
        "<file path="test[special].txt">
        special content
        </file>

        Check @file:test[special].txt"
      `);

      // Cleanup
      fs.unlinkSync(specialFile);
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
