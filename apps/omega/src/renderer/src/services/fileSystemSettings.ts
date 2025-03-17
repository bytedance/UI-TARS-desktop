import { FileSystemSettings } from '../components/LeftSidebar/Settings/types';

const FILE_SYSTEM_SETTINGS_KEY = 'omega-filesystem-settings';

export function loadFileSystemSettings(): FileSystemSettings | null {
  try {
    const settingsJson = localStorage.getItem(FILE_SYSTEM_SETTINGS_KEY);
    if (!settingsJson) return null;
    return JSON.parse(settingsJson) as FileSystemSettings;
  } catch (error) {
    console.error('Failed to load file system settings:', error);
    return null;
  }
}

export function saveFileSystemSettings(settings: FileSystemSettings): void {
  try {
    localStorage.setItem(FILE_SYSTEM_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save file system settings:', error);
  }
}

export function getDefaultDirectory(): string | null {
  const settings = loadFileSystemSettings();
  if (settings && settings.availableDirectories.length > 0) {
    return settings.availableDirectories[0];
  }
  return null;
}

export function isPathAllowed(path: string): boolean {
  const settings = loadFileSystemSettings();
  if (!settings || !settings.availableDirectories.length) return false;

  // If path is not absolute, it's allowed (will be relative to default dir)
  if (!path.startsWith('/')) return true;

  // Check if the path is within any of the allowed directories
  return settings.availableDirectories.some((dir) => path.startsWith(dir));
}
