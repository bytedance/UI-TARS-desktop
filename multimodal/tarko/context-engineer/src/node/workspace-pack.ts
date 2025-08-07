import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/**
 * Information about a single file
 */
interface FileInfo {
  /** Absolute path */
  absolutePath: string;
  /** File content or error message */
  content: string;
  /** Whether reading the file failed */
  hasError: boolean;
  /** File size in bytes */
  size: number;
}

/**
 * Result of workspace packing operation
 */
interface WorkspacePackResult {
  /** List of paths that were processed */
  processedPaths: string[];
  /** All files found in the paths */
  files: FileInfo[];
  /** Formatted content ready for LLM consumption */
  packedContent: string;
  /** Summary statistics */
  stats: {
    totalFiles: number;
    totalSize: number;
    errorCount: number;
  };
}

/**
 * Options for workspace packing
 */
interface WorkspacePackOptions {
  /** Maximum file size to read (in bytes, default: 1MB) */
  maxFileSize?: number;
  /** File extensions to ignore (e.g., ['.jpg', '.png', '.pdf']) */
  ignoreExtensions?: string[];
  /** Directory names to ignore (e.g., ['node_modules', '.git']) */
  ignoreDirs?: string[];
  /** Maximum depth for recursive reading (default: 10) */
  maxDepth?: number;
}

/**
 * Default options for workspace packing
 */
const DEFAULT_OPTIONS: Required<WorkspacePackOptions> = {
  maxFileSize: 1024 * 1024, // 1MB
  ignoreExtensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
  ],
  ignoreDirs: ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'],
  maxDepth: 10,
};

/**
 * WorkspacePack - High-performance workspace content packer
 *
 * Features:
 * - Parallel file reading for optimal performance
 * - Automatic deduplication of paths
 * - Recursive directory traversal with depth limits
 * - Smart filtering of binary and large files
 * - LLM-optimized output formatting
 */
export class WorkspacePack {
  private options: Required<WorkspacePackOptions>;

  constructor(options: WorkspacePackOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Pack multiple files and directories with deduplication and parallel processing
   * @param paths Array of absolute file and directory paths to pack
   * @param cwd Optional current working directory for relative path calculation
   * @returns Promise resolving to pack result
   */
  async packPaths(paths: string[], cwd?: string): Promise<WorkspacePackResult> {
    // Step 1: Validate and deduplicate paths
    const validatedPaths = this.validateAndDeduplicatePaths(paths);

    if (validatedPaths.length === 0) {
      return {
        processedPaths: [],
        files: [],
        packedContent: '',
        stats: { totalFiles: 0, totalSize: 0, errorCount: 0 },
      };
    }

    // Step 2: Collect all files from all paths in parallel
    const fileCollectionPromises = validatedPaths.map((targetPath) =>
      this.collectFilesFromPath(targetPath, 0),
    );

    const fileArrays = await Promise.all(fileCollectionPromises);
    const allFilePaths = fileArrays.flat();

    // Step 3: Deduplicate files (in case paths overlap)
    const uniqueFilePaths = [...new Set(allFilePaths)];

    // Step 4: Read all files in parallel
    const fileReadPromises = uniqueFilePaths.map((filePath) => this.readFileInfo(filePath));

    const files = await Promise.all(fileReadPromises);

    // Step 5: Calculate statistics
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      errorCount: files.filter((file) => file.hasError).length,
    };

    // Step 6: Format content for LLM consumption
    const packedContent = this.formatForLLM(validatedPaths, files, cwd);

    return {
      processedPaths: validatedPaths,
      files,
      packedContent,
      stats,
    };
  }

  /**
   * Validate and deduplicate absolute paths
   */
  private validateAndDeduplicatePaths(paths: string[]): string[] {
    const validPaths: string[] = [];
    const seenPaths = new Set<string>();

    for (const targetPath of paths) {
      try {
        const absolutePath = path.resolve(targetPath);

        // Deduplicate
        if (seenPaths.has(absolutePath)) {
          continue;
        }
        seenPaths.add(absolutePath);

        // Existence check
        if (!fsSync.existsSync(absolutePath)) {
          console.warn(`Path not found: ${targetPath}`);
          continue;
        }

        validPaths.push(absolutePath);
      } catch (error) {
        console.warn(`Failed to validate path ${targetPath}:`, error);
      }
    }

    return validPaths;
  }

  /**
   * Collect files from a single path (file or directory)
   */
  private async collectFilesFromPath(targetPath: string, depth: number): Promise<string[]> {
    try {
      const stat = await fs.stat(targetPath);

      if (stat.isFile()) {
        // Check file extension
        const ext = path.extname(targetPath).toLowerCase();
        if (!this.options.ignoreExtensions.includes(ext)) {
          return [targetPath];
        }
        return [];
      }

      if (stat.isDirectory()) {
        return await this.collectFilesRecursively(targetPath, depth);
      }

      return [];
    } catch (error) {
      console.warn(`Failed to access path ${targetPath}:`, error);
      return [];
    }
  }

  /**
   * Recursively collect all file paths in a directory
   */
  private async collectFilesRecursively(directoryPath: string, depth: number): Promise<string[]> {
    if (depth > this.options.maxDepth) {
      return [];
    }

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      const filePaths: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isFile()) {
          // Check file extension
          const ext = path.extname(entry.name).toLowerCase();
          if (!this.options.ignoreExtensions.includes(ext)) {
            filePaths.push(fullPath);
          }
        } else if (entry.isDirectory()) {
          // Check if directory should be ignored
          if (!this.options.ignoreDirs.includes(entry.name)) {
            const subFiles = await this.collectFilesRecursively(fullPath, depth + 1);
            filePaths.push(...subFiles);
          }
        }
      }

      return filePaths;
    } catch (error) {
      console.warn(`Failed to read directory ${directoryPath}:`, error);
      return [];
    }
  }

  /**
   * Read file information including content
   */
  private async readFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.stat(filePath);

      // Check file size limit
      if (stats.size > this.options.maxFileSize) {
        return {
          absolutePath: filePath,
          content: `[File too large: ${this.formatFileSize(stats.size)}]`,
          hasError: true,
          size: stats.size,
        };
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');

      return {
        absolutePath: filePath,
        content,
        hasError: false,
        size: stats.size,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        absolutePath: filePath,
        content: `[Error reading file: ${errorMessage}]`,
        hasError: true,
        size: 0,
      };
    }
  }

  /**
   * Format the results for optimal LLM consumption using XML structure
   * Uses consistent <directory> tags to align with ContextReferenceProcessor output
   */
  private formatForLLM(processedPaths: string[], files: FileInfo[], cwd?: string): string {
    const sections: string[] = [];

    // Group files by their relative paths from processed paths
    const filesByProcessedPath = new Map<string, FileInfo[]>();

    for (const processedPath of processedPaths) {
      const pathFiles = files.filter((file) => file.absolutePath.startsWith(processedPath));
      filesByProcessedPath.set(processedPath, pathFiles);
    }

    // Format each processed path as a directory XML block
    for (const processedPath of processedPaths) {
      const pathFiles = filesByProcessedPath.get(processedPath) || [];

      if (pathFiles.length === 0) {
        continue;
      }

      // Sort files for consistent output
      const sortedFiles = pathFiles.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));

      // Calculate display path based on cwd parameter
      const displayPath = cwd ? path.relative(cwd, processedPath) || processedPath : processedPath;

      sections.push(`<directory path="${displayPath}">`);

      for (const file of sortedFiles) {
        // Calculate relative path from the processed path
        const fileRelativePath = path.relative(processedPath, file.absolutePath);
        const displayFilePath = fileRelativePath || path.basename(file.absolutePath);

        sections.push(`  <file path="${displayFilePath}">`);

        // Indent file content for better readability
        const indentedContent = file.content
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n');

        sections.push(indentedContent);
        sections.push(`  </file>`);
      }

      sections.push(`</directory>`);
    }

    return sections.join('\n');
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
