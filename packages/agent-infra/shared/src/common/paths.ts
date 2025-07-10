import { homedir, platform } from 'os';
import { join } from 'path';

/**
 * Get the application data directory based on the platform
 * @param appName - The application name (e.g., 'ui-tars-desktop', 'agent-tars-cli')
 * @returns The application data directory path
 */
export function getAppDataDir(appName: string): string {
  const home = homedir();
  const platformName = platform();

  switch (platformName) {
    case 'win32':
      // Windows: %APPDATA%
      return join(
        process.env.APPDATA || join(home, 'AppData', 'Roaming'),
        appName,
      );

    case 'darwin':
      // macOS: ~/Library/Application Support
      return join(home, 'Library', 'Application Support', appName);

    case 'linux':
      // Linux: ~/.config (follow XDG Base Directory specification)
      return join(
        process.env.XDG_CONFIG_HOME || join(home, '.config'),
        appName,
      );

    default:
      // Fallback to home directory
      return join(home, `.${appName}`);
  }
}

/**
 * Get the default browser user data directory for an application
 * @param appName - The application name (e.g., 'ui-tars-desktop', 'agent-tars-cli')
 * @param profileName - The profile name (default: 'local-browser')
 * @returns The browser user data directory path
 */
export function getDefaultBrowserUserDataDir(
  appName: string,
  profileName: string = 'local-browser',
): string {
  return join(getAppDataDir(appName), 'browser-profiles', profileName);
}
