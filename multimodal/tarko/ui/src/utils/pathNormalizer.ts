/**
 * Path normalization utilities for privacy and display optimization
 *
 * Features:
 * - Hide username information in file paths
 * - Cross-platform compatibility (Windows, macOS, Linux)
 * - Performance optimization with global caching
 * - Type-safe implementation
 */

const normalizedPathCache = new Map<string, string>();

const USER_DIR_PATTERNS = {
  windows: [
    /^([A-Z]:[/\\])Users[/\\][^/\\]+([/\\].*)?$/i,
    /^([A-Z]:[/\\])Documents and Settings[/\\][^/\\]+([/\\].*)?$/i,
  ],
  unix: [/^\/Users\/[^/]+(\/.*)?\/?$/, /^\/home\/[^/]+(\/.*)?\/?$/],
} as const;

function detectPlatform(): 'windows' | 'unix' {
  return typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win')
    ? 'windows'
    : 'unix';
}

/**
 * Normalizes file paths by replacing user directory with tilde (~)
 *
 * Examples:
 * - macOS: `/Users/john/.agent-tars-workspace/file.html` → `~/.agent-tars-workspace/file.html`
 * - Windows: `C:\Users\john\.agent-tars-workspace\file.html` → `~\.agent-tars-workspace\file.html`
 * - Linux: `/home/john/.agent-tars-workspace/file.html` → `~/.agent-tars-workspace/file.html`
 *
 * @param absolutePath - The absolute file path to normalize
 * @returns Normalized path with user directory replaced by tilde, or original path if not a user path
 */
export function normalizeFilePath(absolutePath: string): string {
  if (!absolutePath || typeof absolutePath !== 'string') {
    return absolutePath;
  }

  const cachedResult = normalizedPathCache.get(absolutePath);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const platform = detectPlatform();
  const patterns = USER_DIR_PATTERNS[platform];

  let normalizedPath = absolutePath;

  for (const pattern of patterns) {
    const match = absolutePath.match(pattern);
    if (match) {
      if (platform === 'windows') {
        const remainingPath = match[2] || '';
        normalizedPath = `~${remainingPath}`;
      } else {
        const remainingPath = match[1] || '';
        normalizedPath = `~${remainingPath}`;
      }
      break;
    }
  }

  normalizedPathCache.set(absolutePath, normalizedPath);

  return normalizedPath;
}

export function normalizeFilePathsBatch(paths: string[]): string[] {
  return paths.map(normalizeFilePath);
}

export function clearPathNormalizationCache(): void {
  normalizedPathCache.clear();
}

export function getPathNormalizationCacheSize(): number {
  return normalizedPathCache.size;
}

export function isAbsolutePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  if (/^[A-Z]:[/\\]/i.test(path)) {
    return true;
  }

  if (path.startsWith('/')) {
    return true;
  }

  return false;
}
