import { MCPClient, MCPServer } from '@agent-infra/mcp-client';
import { MCPServerName } from '@agent-infra/shared';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logger } from '@main/utils/logger';
import { getActiveMcpSettings } from './tools';

// Keep track of the filesystem client to allow updating allowed directories
let fsMcpServerModule: any = null;

export const getOmegaDir = async () => {
  // Create working directory in user's home directory.
  const omegaDir = path.join(os.homedir(), '.omega');
  if (!fs.existsSync(omegaDir)) {
    await fs.mkdir(omegaDir, { recursive: true });
  }
  return omegaDir;
};

const dynamicImport = (url) =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(`return import('${url}')`)();

// Initialize MCP client with filesystem and commands tools
export const createMcpClient = async () => {
  if (mapClientRef.current) {
    return mapClientRef.current;
  }
  const commandModule = await dynamicImport('@agent-infra/mcp-server-commands');
  const fsModule = await dynamicImport('@agent-infra/mcp-server-filesystem');
  const browserModule = await dynamicImport('@agent-infra/mcp-server-browser');

  const { createServer: createCommandServer } = commandModule.default;
  const { createServer: createFileSystemServer } = fsModule.default;
  const { createServer: createBrowserServer } = browserModule.default;

  fsMcpServerModule = fsModule.default;

  const omegaDir = await getOmegaDir();

  const toolsMap: Record<MCPServerName, MCPServer<MCPServerName>> = {
    [MCPServerName.FileSystem]: {
      type: 'builtin',
      name: MCPServerName.FileSystem,
      description: 'filesystem tool',
      mcpServer: createFileSystemServer({
        allowedDirectories: [omegaDir],
      }),
    },
    [MCPServerName.Commands]: {
      type: 'builtin',
      name: MCPServerName.Commands,
      description: 'commands tool',
      mcpServer: createCommandServer(),
    },
    [MCPServerName.Browser]: {
      type: 'builtin',
      name: MCPServerName.Browser,
      description: 'browser tools',
      mcpServer: createBrowserServer({
        launchOptions: {
          headless: true,
        },
      }),
    },
    ...getActiveMcpSettings(),
  };

  logger.info('toolsMap', toolsMap);

  const client = new MCPClient(Object.values(toolsMap));
  mapClientRef.current = client;
  return client;
};

export const mapClientRef: {
  current: MCPClient | undefined;
} = {
  current: undefined,
};

export const setAllowedDirectories = async (directories: string[]) => {
  if (fsMcpServerModule && fsMcpServerModule.setAllowedDirectories) {
    return fsMcpServerModule.setAllowedDirectories(directories);
  }
  throw new Error('File system client not initialized');
};

export const getAllowedDirectories = async (): Promise<string[]> => {
  if (fsMcpServerModule && fsMcpServerModule.getAllowedDirectories) {
    return fsMcpServerModule.getAllowedDirectories();
  }
  const omegaDir = await getOmegaDir();
  return [omegaDir];
};
