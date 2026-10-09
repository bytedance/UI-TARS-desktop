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

/**
 * Each entry records which capture group holds the part of the path that follows
 * the user directory: the Windows patterns capture the drive root first, so their
 * remainder is group 2, while the POSIX patterns capture only the remainder.
 */
const USER_DIR_PATTERNS: ReadonlyArray<{ regex: RegExp; restGroup: number }> = [
  { regex: /^([A-Z]:[/\\])Users[/\\][^/\\]+([/\\].*)?$/i, restGroup: 2 },
  {
    regex: /^([A-Z]:[/\\])Documents and Settings[/\\][^/\\]+([/\\].*)?$/i,
    restGroup: 2,
  },
  { regex: /^\/Users\/[^/]+(\/.*)?\/?$/, restGroup: 1 },
  { regex: /^\/home\/[^/]+(\/.*)?\/?$/, restGroup: 1 },
];

/**
 * Normalizes file paths by replacing user directory with tilde (~)
 *
 * Examples:
 * - macOS: `/Users/john/.agent-tars-workspace/file.html` → `~/.agent-tars-workspace/file.html`
 * - Windows: `C:\Users\john\.agent-tars-workspace\file.html` → `~\.agent-tars-workspace\file.html`
 * - Linux: `/home/john/.agent-tars-workspace/file.html` → `~/.agent-tars-workspace/file.html`
 *
 * The pattern set is selected by the shape of the path, not by the platform of the
 * browser rendering it: the paths shown here come from the agent server, which may
 * run in a container or on another host.
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

  let normalizedPath = absolutePath;

  for (const { regex, restGroup } of USER_DIR_PATTERNS) {
    const match = absolutePath.match(regex);
    if (match) {
      const remainingPath = match[restGroup] || '';
      normalizedPath = `~${remainingPath}`;
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
