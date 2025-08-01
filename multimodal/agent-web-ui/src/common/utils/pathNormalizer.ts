/**
 * Path normalization utilities for privacy and display optimization
 *
 * Features:
 * - Hide username information in file paths
 * - Cross-platform compatibility (Windows, macOS, Linux)
 * - Performance optimization with global caching
 * - Type-safe implementation
 */

// Global cache for normalized paths to ensure single computation per path
const normalizedPathCache = new Map<string, string>();

// User directory patterns for different platforms
const USER_DIR_PATTERNS = {
  // Windows: C:\Users\username\ or C:\Documents and Settings\username\
  windows: [
    /^([A-Z]:[/\\])Users[/\\][^/\\]+([/\\].*)?$/i,
    /^([A-Z]:[/\\])Documents and Settings[/\\][^/\\]+([/\\].*)?$/i,
  ],
  // macOS/Linux: /Users/username/ or /home/username/
  unix: [/^\/Users\/[^/]+(\/.*)?\/?$/, /^\/home\/[^/]+(\/.*)?\/?$/],
} as const;

/**
 * Detects the current platform type
 */
function detectPlatform(): 'windows' | 'unix' {
  // In browser environment, we need to detect based on path format
  // since navigator.platform might not be reliable
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
  // Return early for empty or invalid paths
  if (!absolutePath || typeof absolutePath !== 'string') {
    return absolutePath;
  }

  // Check cache first for performance
  const cachedResult = normalizedPathCache.get(absolutePath);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const platform = detectPlatform();
  const patterns = USER_DIR_PATTERNS[platform];

  let normalizedPath = absolutePath;

  // Try to match against platform-specific patterns
  for (const pattern of patterns) {
    const match = absolutePath.match(pattern);
    if (match) {
      if (platform === 'windows') {
        // Windows: preserve drive letter and replace Users/username with ~
        // e.g., C:\Users\john\file.txt → C:\~\file.txt → ~\file.txt
        const driveLetter = match[1] || '';
        const remainingPath = match[2] || '';
        normalizedPath = `~${remainingPath}`;
      } else {
        // Unix-like: replace /Users/username or /home/username with ~
        const remainingPath = match[1] || '';
        normalizedPath = `~${remainingPath}`;
      }
      break;
    }
  }

  // Cache the result for future use
  normalizedPathCache.set(absolutePath, normalizedPath);

  return normalizedPath;
}

/**
 * Batch normalize multiple file paths for better performance
 *
 * @param paths - Array of absolute file paths to normalize
 * @returns Array of normalized paths in the same order
 */
export function normalizeFilePathsBatch(paths: string[]): string[] {
  return paths.map(normalizeFilePath);
}

/**
 * Clears the normalization cache (useful for testing or memory management)
 */
export function clearPathNormalizationCache(): void {
  normalizedPathCache.clear();
}

/**
 * Gets the current cache size (useful for monitoring)
 */
export function getPathNormalizationCacheSize(): number {
  return normalizedPathCache.size;
}

/**
 * Type guard to check if a string looks like an absolute path
 */
export function isAbsolutePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Windows absolute path: starts with drive letter
  if (/^[A-Z]:[/\\]/i.test(path)) {
    return true;
  }

  // Unix absolute path: starts with /
  if (path.startsWith('/')) {
    return true;
  }

  return false;
}
