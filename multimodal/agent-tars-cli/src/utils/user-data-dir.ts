import { getDefaultBrowserUserDataDir } from '@agent-infra/shared';

/**
 * Get the default user data directory path based on the operating system
 *
 * - Windows: %APPDATA%/agent-tars-cli/browser-profiles/local-browser/
 * - macOS: ~/Library/Application Support/agent-tars-cli/browser-profiles/local-browser/
 * - Linux: ~/.config/agent-tars-cli/browser-profiles/local-browser/
 */
export function getDefaultUserDataDir(): string {
  // Use the shared function with 'agent-tars-cli' as the app name
  return getDefaultBrowserUserDataDir('agent-tars-cli');
}
