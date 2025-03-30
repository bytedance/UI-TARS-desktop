/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';
import fs from 'node:fs/promises';
import fsSync from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CallToolResult,
  TextContent,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CreateDirectoryArgsSchema,
  DirectoryTreeArgsSchema,
  EditFileArgsSchema,
  GetFileInfoArgsSchema,
  ListDirectoryArgsSchema,
  MoveFileArgsSchema,
  ReadFileArgsSchema,
  ReadMultipleFilesArgsSchema,
  SearchFilesArgsSchema,
  WriteFileArgsSchema,
} from './schema.js';
import {
  normalizePath,
  expandHome,
  applyFileEdits,
  getFileStats,
} from './utils.js';

let allowedDirectories: string[] = [];

export function setAllowedDirectories(dirs: string[]) {
  allowedDirectories = dirs.map((dir) => {
    // Store allowed directories in normalized form
    return normalizePath(path.resolve(expandHome(dir)));
  });

  allowedDirectories.forEach((dir) => {
    const stats = fsSync.statSync(dir);
    if (!stats.isDirectory()) {
      console.error(`Error: ${dir} is not a directory`);
      throw new Error(`${dir} is not a directory`);
    }
  });
}

export function getAllowedDirectories() {
  return allowedDirectories;
}

// Security utilities
async function validatePath(requestedPath: string): Promise<string> {
  console.log('requestedPath', requestedPath);
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(process.cwd(), expandedPath);

  const normalizedRequested = normalizePath(absolute);
  console.log('allowedDirectories', allowedDirectories);

  // Check if path is within allowed directories
  const isAllowed = allowedDirectories.some((dir) =>
    normalizedRequested.startsWith(dir),
  );
  if (!isAllowed) {
    throw new Error(
      `Access denied - path outside allowed directories: ${absolute} not in ${allowedDirectories.join(', ')}`,
    );
  }

  // Handle symlinks by checking their real path
  try {
    const realPath = await fs.realpath(absolute);
    const normalizedReal = normalizePath(realPath);
    const isRealPathAllowed = allowedDirectories.some((dir) =>
      normalizedReal.startsWith(dir),
    );
    if (!isRealPathAllowed) {
      throw new Error(
        'Access denied - symlink target outside allowed directories',
      );
    }
    return realPath;
  } catch (error) {
    console.error('[validatePath] error', error);
    // For new files that don't exist yet, verify parent directory
    const parentDir = path.dirname(absolute);
    console.log('parentDir', parentDir);
    try {
      const realParentPath = await fs.realpath(parentDir);
      const normalizedParent = normalizePath(realParentPath);
      const isParentAllowed = allowedDirectories.some((dir) =>
        normalizedParent.startsWith(dir),
      );
      if (!isParentAllowed) {
        throw new Error(
          'Access denied - parent directory outside allowed directories',
        );
      }
      return absolute;
    } catch (error) {
      console.error('[validatePath] error_2', error);
      throw new Error(`Parent directory does not exist: ${parentDir}`);
    }
  }
}

const toolsMap = {
  read_file: {
    description:
      'Read the complete contents of a file from the file system. ' +
      'Handles various text encodings and provides detailed error messages ' +
      'if the file cannot be read. Use this tool when you need to examine ' +
      'the contents of a single file. Only works within allowed directories.',
    inputSchema: ReadFileArgsSchema,
  },
  read_multiple_files: {
    description:
      'Read the contents of multiple files simultaneously. This is more ' +
      'efficient than reading files one by one when you need to analyze ' +
      "or compare multiple files. Each file's content is returned with its " +
      "path as a reference. Failed reads for individual files won't stop " +
      'the entire operation. Only works within allowed directories.',
    inputSchema: ReadMultipleFilesArgsSchema,
  },
  write_file: {
    description:
      'Create a new file or completely overwrite an existing file with new content. ' +
      'Use with caution as it will overwrite existing files without warning. ' +
      'Handles text content with proper encoding. Only works within allowed directories.',
    inputSchema: WriteFileArgsSchema,
  },
  edit_file: {
    description:
      'Make line-based edits to a text file. Each edit replaces exact line sequences ' +
      'with new content. Returns a git-style diff showing the changes made. ' +
      'Only works within allowed directories.',
    inputSchema: EditFileArgsSchema,
  },
  create_directory: {
    description:
      'Create a new directory or ensure a directory exists. Can create multiple ' +
      'nested directories in one operation. If the directory already exists, ' +
      'this operation will succeed silently. Perfect for setting up directory ' +
      'structures for projects or ensuring required paths exist. Only works within allowed directories.',
    inputSchema: CreateDirectoryArgsSchema,
  },
  list_directory: {
    description:
      'Get a detailed listing of all files and directories in a specified path. ' +
      'Results clearly distinguish between files and directories with [FILE] and [DIR] ' +
      'prefixes. This tool is essential for understanding directory structure and ' +
      'finding specific files within a directory. Only works within allowed directories.',
    inputSchema: ListDirectoryArgsSchema,
  },
  directory_tree: {
    description:
      'Get a recursive tree view of files and directories as a JSON structure. ' +
      "Each entry includes 'name', 'type' (file/directory), and 'children' for directories. " +
      'Files have no children array, while directories always have a children array (which may be empty). ' +
      'The output is formatted with 2-space indentation for readability. Only works within allowed directories.',
    inputSchema: DirectoryTreeArgsSchema,
  },
  move_file: {
    description:
      'Move or rename files and directories. Can move files between directories ' +
      'and rename them in a single operation. If the destination exists, the ' +
      'operation will fail. Works across different directories and can be used ' +
      'for simple renaming within the same directory. Both source and destination must be within allowed directories.',
    inputSchema: MoveFileArgsSchema,
  },
  search_files: {
    description:
      'Recursively search for files and directories matching a pattern. ' +
      'Searches through all subdirectories from the starting path. The search ' +
      'is case-insensitive and matches partial names. Returns full paths to all ' +
      "matching items. Great for finding files when you don't know their exact location. " +
      'Only searches within allowed directories.',
    inputSchema: SearchFilesArgsSchema,
  },
  get_file_info: {
    description:
      'Retrieve detailed metadata about a file or directory. Returns comprehensive ' +
      'information including size, creation time, last modified time, permissions, ' +
      'and type. This tool is perfect for understanding file characteristics ' +
      'without reading the actual content. Only works within allowed directories.',
    inputSchema: GetFileInfoArgsSchema,
  },
  list_allowed_directories: {
    description:
      'Returns the list of directories that this server is allowed to access. ' +
      'Use this to understand which directories are available before trying to access files.',
    inputSchema: z.object({}),
  },
};

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;
type ToolNames = keyof typeof toolsMap;
type ToolInputMap = {
  [K in ToolNames]: z.infer<(typeof toolsMap)[K]['inputSchema']>;
};

const listTools: Client['listTools'] = async () => {
  const mcpTools = Object.keys(toolsMap || {}).map((key) => {
    const name = key as ToolNames;
    const tool = toolsMap[name];
    return {
      // @ts-ignore
      name: tool?.name || name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema) as ToolInput,
    };
  });

  return {
    tools: mcpTools,
  };
};

async function searchFiles(
  rootPath: string,
  pattern: string,
  excludePatterns: string[] = [],
): Promise<string[]> {
  const results: string[] = [];

  async function search(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      try {
        // Validate each path before processing
        await validatePath(fullPath);

        // Check if path matches any exclude pattern
        const relativePath = path.relative(rootPath, fullPath);
        const shouldExclude = excludePatterns.some((pattern) => {
          const globPattern = pattern.includes('*')
            ? pattern
            : `**/${pattern}/**`;
          return minimatch(relativePath, globPattern, { dot: true });
        });

        if (shouldExclude) {
          continue;
        }

        if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(fullPath);
        }

        if (entry.isDirectory()) {
          await search(fullPath);
        }
      } catch (error) {
        // Skip invalid paths during search
        continue;
      }
    }
  }

  await search(rootPath);
  return results;
}

const callTool: Client['callTool'] = async ({
  name,
  arguments: toolArgs,
}): Promise<CallToolResult> => {
  const handlers: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    read_file: async (args) => {
      const parsed = ReadFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for read_file: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.path);
      const content = await fs.readFile(validPath, 'utf-8');
      return {
        content: [{ type: 'text', text: content }],
      };
    },
    read_multiple_files: async (args) => {
      const parsed = ReadMultipleFilesArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for read_multiple_files: ${parsed.error}`,
        );
      }
      const results = await Promise.all(
        parsed.data.paths.map(async (filePath: string) => {
          try {
            const validPath = await validatePath(filePath);
            const content = await fs.readFile(validPath, 'utf-8');
            return `${filePath}:\n${content}\n`;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return `${filePath}: Error - ${errorMessage}`;
          }
        }),
      );
      return {
        content: [{ type: 'text', text: results.join('\n---\n') }],
      };
    },
    write_file: async (args) => {
      const parsed = WriteFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.path);
      await fs.writeFile(validPath, parsed.data.content, 'utf-8');
      return {
        content: [
          { type: 'text', text: `Successfully wrote to ${parsed.data.path}` },
        ],
      };
    },
    edit_file: async (args) => {
      const parsed = EditFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.path);
      const result = await applyFileEdits(
        validPath,
        parsed.data.edits,
        parsed.data.dryRun,
      );
      return {
        content: [{ type: 'text', text: result }],
      };
    },
    create_directory: async (args) => {
      const parsed = CreateDirectoryArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for create_directory: ${parsed.error}`,
        );
      }
      const validPath = await validatePath(parsed.data.path);
      await fs.mkdir(validPath, { recursive: true });
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created directory ${parsed.data.path}`,
          },
        ],
      };
    },
    list_directory: async (args) => {
      const parsed = ListDirectoryArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for list_directory: ${parsed.error}`,
        );
      }
      const validPath = await validatePath(parsed.data.path);
      const entries = await fs.readdir(validPath, { withFileTypes: true });
      const formatted = entries
        .map(
          (entry) =>
            `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`,
        )
        .join('\n');
      return {
        content: [{ type: 'text', text: formatted }],
      };
    },
    directory_tree: async (args) => {
      const parsed = DirectoryTreeArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for directory_tree: ${parsed.error}`,
        );
      }

      interface TreeEntry {
        name: string;
        type: 'file' | 'directory';
        children?: TreeEntry[];
      }

      async function buildTree(currentPath: string): Promise<TreeEntry[]> {
        const validPath = await validatePath(currentPath);
        const entries = await fs.readdir(validPath, { withFileTypes: true });
        const result: TreeEntry[] = [];

        for (const entry of entries) {
          const entryData: TreeEntry = {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
          };

          if (entry.isDirectory()) {
            const subPath = path.join(currentPath, entry.name);
            entryData.children = await buildTree(subPath);
          }

          result.push(entryData);
        }

        return result;
      }

      const treeData = await buildTree(parsed.data.path);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(treeData, null, 2),
          },
        ],
      };
    },
    move_file: async (args) => {
      const parsed = MoveFileArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for move_file: ${parsed.error}`);
      }
      const validSourcePath = await validatePath(parsed.data.source);
      const validDestPath = await validatePath(parsed.data.destination);
      await fs.rename(validSourcePath, validDestPath);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}`,
          },
        ],
      };
    },
    search_files: async (args) => {
      const parsed = SearchFilesArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.path);
      const results = await searchFiles(
        validPath,
        parsed.data.pattern,
        parsed.data.excludePatterns,
      );
      return {
        content: [
          {
            type: 'text',
            text: results.length > 0 ? results.join('\n') : 'No matches found',
          },
        ],
      };
    },
    get_file_info: async (args) => {
      const parsed = GetFileInfoArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for get_file_info: ${parsed.error}`);
      }
      const validPath = await validatePath(parsed.data.path);
      const info = await getFileStats(validPath);
      return {
        content: [
          {
            type: 'text',
            text: Object.entries(info)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n'),
          },
        ],
      };
    },
    list_allowed_directories: async () => {
      return {
        content: [
          {
            type: 'text',
            text: `Allowed directories:\n${allowedDirectories.join('\n')}`,
          },
        ],
      };
    },
  };

  if (handlers[name as ToolNames]) {
    return handlers[name as ToolNames](toolArgs as any);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
};

const close: Client['close'] = async () => {
  return;
};

// https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/utilities/ping/#behavior-requirements
const ping: Client['ping'] = async () => {
  return {
    _meta: {},
  };
};

export const client: Pick<Client, 'callTool' | 'listTools' | 'close' | 'ping'> =
  {
    callTool,
    listTools,
    close,
    ping,
  };
