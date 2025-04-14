import { initIpc } from '@ui-tars/electron-ipc/main';
import { setAllowedDirectories, getAllowedDirectories } from '@main/mcp/client';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logger } from '@main/utils/logger';

const t = initIpc.create();

interface FileSystemSettings {
  availableDirectories: string[];
}

export const fileSystemRoute = t.router({
  updateFileSystemConfig: t.procedure
    .input<FileSystemSettings>()
    .handle(async ({ input }) => {
      try {
        // Always include the default .omega directory
        const omegaDir = path.join(os.homedir(), '.omega');

        // Combine with user-specified directories, ensuring no duplicates
        const allDirectories = [
          omegaDir,
          ...input.availableDirectories.filter((dir) => dir !== omegaDir),
        ];

        // Update allowed directories in the MCP file system client
        await setAllowedDirectories(allDirectories);

        return true;
      } catch (error) {
        return false;
      }
    }),

  getFileContent: t.procedure
    .input<{ filePath: string }>()
    .handle(async ({ input }) => {
      try {
        const exists = await fs.pathExists(input.filePath);
        if (!exists) {
          return null;
        }
        const content = await fs.readFile(input.filePath, 'utf8');
        return content;
      } catch (error) {
        logger.error('Failed to read file:', error);
        return null;
      }
    }),
  getAllowedDirectories: t.procedure.input<void>().handle(async () => {
    try {
      return await getAllowedDirectories();
    } catch (error) {
      logger.error('Failed to get allowed directories:', error);
      const omegaDir = path.join(os.homedir(), '.omega');
      return [omegaDir];
    }
  }),
});
