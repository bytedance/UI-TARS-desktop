import { ipcClient } from '@renderer/api';

export async function getDefaultDirectory(): Promise<string | null> {
  const settings = await ipcClient.getFileSystemSettings();
  if (settings && settings.availableDirectories.length > 0) {
    return settings.availableDirectories[0];
  }
  return null;
}

export async function isPathAllowed(path: string): Promise<boolean> {
  const settings = await ipcClient.getFileSystemSettings();
  if (!settings || !settings.availableDirectories.length) return false;

  // If path is not absolute, it's allowed (will be relative to default dir)
  if (!path.startsWith('/')) return true;

  // Check if the path is within any of the allowed directories
  return settings.availableDirectories.some((dir) => path.startsWith(dir));
}
